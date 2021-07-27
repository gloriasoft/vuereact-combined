import React, { Fragment } from "react"
import ReactDOM from "react-dom"
import applyVueInReact, { VueContainer } from "./applyVueInReact"
import options, { setOptions } from "./options"
// vueRootInfo是为了保存vue的root节点options部分信息，现在保存router、store，在applyVueInReact方法中创建vue的中间件实例时会被设置
// 为了使applyReactInVue -> applyVueInReact之后的vue组件依旧能引用vuex和vue router
import vueRootInfo from "./vueRootInfo"
class FunctionComponentWrap extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const Component = this.props.component
    const { ref, ...props } = this.props.passedProps
    return <Component {...props}>{this.props.children}</Component>
  }
}
const createReactContainer = (Component, options, wrapInstance) => class applyReact extends React.Component {
  // 用于reactDevTools调试用
  static displayName = `useReact_${Component.displayName || Component.name || "Component"}`

  // 使用静态方法申明是因为可以节省性能开销，因为内部没有调用到实例属性和方法
  setRef(ref) {
    if (!ref) return
    // 使用reactRef属性保存目标react组件的实例，可以被父组setRef件的实例获取到
    wrapInstance.reactRef = ref

    // 并且将vue的中间件实例保存在react组件的实例中
    // react组件可以通过这个属性来判断是否被包囊使用
    ref.vueWrapperRef = wrapInstance
  }

  constructor(props) {
    super(props)
    // 将所有的属性全部寄存在中间件的状态中，原理是通过一个有状态的React组件作为中间件，触发目标组件的props
    this.state = {
      ...props,
      ...(options.isSlots ? { children: Component } : {}),
    }
    this.setRef = this.setRef.bind(this)
  }

  // 对于插槽的处理仍然需要将VNode转换成React组件
  createSlot(children) {
    const { style, ...attrs } = options.react.slotWrapAttrs
    return {
      inheritAttrs: false,
      __fromReactSlot: true,
      render: (createElement) => createElement(options.react.slotWrap, { attrs, style }, children),
    }
  }

  componentWillUnmount() {
    if (!wrapInstance.reactRef) return
    // 垃圾回收，但是保留属性名，借鉴vue的refs对于组件销毁保留属性名的模式
    wrapInstance.reactRef.vueWrapperRef = null
    wrapInstance.reactRef = null
  }

  static catchVueRefs() {
    if (!wrapInstance.$parent) return false
    for (const ref in wrapInstance.$parent.$refs) {
      if (wrapInstance.$parent.$refs[ref] === wrapInstance) {
        return true
      }
    }
    return false
  }

  render() {
    let {
      children,
      "data-passed-props": __passedProps,
      ...props
    } = this.state
    // 保留一份作用域和具名插槽，用于之后再透传给vue组件
    const $slots = {}
    const $scopedSlots = {}
    // 插槽的解析
    for (const i in props) {
      if (!props.hasOwnProperty(i) || props[i] == null) continue
      if (props[i].__slot) {
        if (!props[i].reactSlot) {
          const vueSlot = props[i]
          // 执行applyVueInReact方法将直接获得react组件对象，无需使用jsx
          // props[i] = { ...applyVueInReact(this.createSlot(props[i]))() }
          props[i] = { ...applyVueInReact(this.createSlot(props[i]), { ...options, isSlots: true }).render() }
          props[i].vueSlot = vueSlot
        } else {
          props[i] = props[i].reactSlot
        }
        $slots[i] = props[i]
      } else if (props[i].__scopedSlot) {
        // 作用域插槽是个纯函数，在react组件中需要传入作用域调用，然后再创建vue的插槽组件
        props[i] = props[i](this.createSlot)
        $scopedSlots[i] = props[i]
      }
    }
    // 普通插槽
    if (children != null) {
      if (!children.reactSlot) {
        const vueSlot = children
        children = { ...applyVueInReact(this.createSlot(children), { ...options, isSlots: true }).render() }
        children.vueSlot = vueSlot
      } else {
        children = children.reactSlot
      }
    }
    $slots.default = children
    // 封装透传属性
    __passedProps = { ...__passedProps, ...{ $slots, $scopedSlots }, children }
    const refInfo = {}
    // 判断是否要加ref，因为无状态的函数组件没有ref
    // 通过判断Component的原型是否不是Function原型
    refInfo.ref = this.setRef
    if (options.isSlots) {
      return this.state.children || this.props.children
    }
    if ((Object.getPrototypeOf(Component) !== Function.prototype && !(typeof Component === "object" && !Component.render)) || applyReact.catchVueRefs()) {
      refInfo.ref = this.setRef
      return (
        <Component {...props}
                   {...{ "data-passed-props": __passedProps }} {...refInfo}>
          {children}
        </Component>
      )
    }
    const newProps = { ...props, ...{ "data-passed-props": __passedProps } }
    return <FunctionComponentWrap passedProps={newProps} component={Component} {...refInfo}>{children}</FunctionComponentWrap>
  }
}
export default function applyReactInVue(component, options = {}) {
  // 兼容esModule
  if (component.__esModule && component.default) {
    component = component.default
  }
  if (options.isSlots) {
    component = component()
  }
  // 处理附加参数
  options = setOptions(options, undefined, true)

  return {
    created() {
      if (this.$root.$options.router) {
        vueRootInfo.router = this.$root.$options.router
      }
      if (this.$root.$options.router) {
        vueRootInfo.store = this.$root.$options.store
      }
    },
    props: ["dataPassedProps"],
    render(createElement) {
      const { style, ...attrs } = options.react.componentWrapAttrs
      return createElement(options.react.componentWrap, { ref: "react", attrs, style })
    },
    methods: {
      // 用多阶函数解决作用域插槽的传递问题
      getScopeSlot(slotFunction) {
        function scopedSlotFunction(createReactSlot) {
          function getSlot(context) {
            if (slotFunction.reactFunction) {
              return slotFunction.reactFunction(context)
            }
            return applyVueInReact(createReactSlot(slotFunction(context)), { ...options, isSlots: true }).render()
          }
          getSlot.vueFunction = slotFunction
          return getSlot
        }
        scopedSlotFunction.__scopedSlot = true
        return scopedSlotFunction
      },
      mountReactComponent(update) {
        // 先提取透传属性
        let {
          on: __passedPropsOn,
          $slots: __passedPropsSlots,
          $scopedSlots: __passedPropsScopedSlots,
          children,
          ...__passedPropsRest
        } = (this.$props.dataPassedProps != null ? this.$props.dataPassedProps : {})

        // 处理具名插槽，将作为属性被传递
        const normalSlots = {}
        const mergeSlots = { ...__passedPropsSlots, ...this.$slots }
        // 对插槽类型的属性做标记
        for (const i in mergeSlots) {
          normalSlots[i] = mergeSlots[i]
          normalSlots[i].__slot = true
        }
        // 对作用域插槽进行处理
        const scopedSlots = {}
        const mergeScopedSlots = { ...__passedPropsScopedSlots, ...this.$scopedSlots }
        for (const i in mergeScopedSlots) {
          // 过滤普通插槽
          if (normalSlots[i]) {
            // 并且做上标记，vue2.6之后，所有插槽都推荐用作用域，所以之后要转成普通插槽
            if (this.$scopedSlots[i]) {
              this.$scopedSlots[i].__slot = true
            }
            continue
          }
          // 如果发现作用域插槽中有普通插槽的标记，就转成成普通插槽
          if (mergeScopedSlots[i].__slot) {
            normalSlots[i] = mergeScopedSlots[i]()
            normalSlots[i].__slot = true
            continue
          }
          scopedSlots[i] = this.getScopeSlot(mergeScopedSlots[i])
        }
        // 预生成react组件的透传属性
        const __passedProps = {
          ...__passedPropsRest,
          ...{ ...this.$attrs },
          $slots: normalSlots,
          $scopedSlots: scopedSlots,
          children,
          on: { ...__passedPropsOn, ...this.$listeners },
        }
        const lastNormalSlots = { ...normalSlots }
        children = lastNormalSlots.default
        delete lastNormalSlots.default
        // 如果不传入组件，就作为更新
        if (!update) {
          const Component = createReactContainer(component, options, this)
          let reactRootComponent = <Component
            {...__passedPropsRest}
            {...this.$attrs}
            {...__passedProps.on}
            {...{ children }}
            {...lastNormalSlots}
            {...scopedSlots}
            {...{ "data-passed-props": __passedProps }}
            ref={(ref) => (this.reactInstance = ref)}
          />
          // 必须通过ReactReduxContext连接context
          if (this.$redux && this.$redux.store && this.$redux.ReactReduxContext) {
            const ReduxContext = this.$redux.ReactReduxContext
            reactRootComponent = <ReduxContext.Provider value={{ store: this.$redux.store }}>{reactRootComponent}</ReduxContext.Provider>
          }
          // 必须异步，等待包囊层的react实例完毕
          this.$nextTick(() => {
            const container = this.$refs.react
            let parentInstance = this.$parent
            let reactWrapperRef
            // 向上查找react包囊层
            while (parentInstance) {
              if (parentInstance.parentReactWrapperRef) {
                reactWrapperRef = parentInstance.parentReactWrapperRef
                break
              }
              if (parentInstance.reactWrapperRef) {
                reactWrapperRef = parentInstance.reactWrapperRef
                break
              }
              parentInstance = parentInstance.$parent
            }
            // 如果存在包囊层，则激活portal
            if (reactWrapperRef) {
              // 存储包囊层引用
              this.parentReactWrapperRef = reactWrapperRef
              // 存储portal引用
              this.reactPortal = () => ReactDOM.createPortal(
                reactRootComponent,
                container
              )
              reactWrapperRef.pushPortal(this.reactPortal)
              return
            }
            ReactDOM.render(
              reactRootComponent,
              container
            )
          })
        } else {
          // 更新
          // 异步合并更新
          clearTimeout(this.updateTimer)
          this.updateTimer = setTimeout(() => {
            this.reactInstance.setState({
              ...__passedPropsRest,
              ...this.$attrs,
              ...this.$listeners,
              ...{ children },
              ...lastNormalSlots,
              ...scopedSlots,
              ...{ "data-passed-props": __passedProps },
            })
          })
        }
      },
    },
    mounted() {
      clearTimeout(this.updateTimer)
      this.mountReactComponent()
    },
    beforeDestroy() {
      clearTimeout(this.updateTimer)
      // 删除portal
      if (this.reactPortal) {
        const { portals } = this.parentReactWrapperRef.state
        const index = portals.indexOf(this.reactPortal)
        portals.splice(index, 1)
        this.parentReactWrapperRef.setState({ portals })
        return
      }
      // 删除根节点
      ReactDOM.unmountComponentAtNode(this.$refs.react)
    },
    updated() {
      this.mountReactComponent(true)
    },
    inheritAttrs: false,
    watch: {
      $attrs: {
        handler() {
          this.mountReactComponent(true)
        },
        deep: true,
      },
      $listeners: {
        handler() {
          this.mountReactComponent(true)
        },
        deep: true,
      },
      "$props.dataPassedProps": {
        handler() {
          this.mountReactComponent(true)
        },
        deep: true,
      },
    },
  }
}
