import React, {version} from "react"
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
    this.vueInReactCall = this.vueInReactCall.bind(this)
    this.vueWrapperRef = wrapInstance
  }

  // 对于插槽的处理仍然需要将VNode转换成React组件
  createSlot(children) {
    const { style, ...attrs } = options.react.slotWrapAttrs
    return {
      inheritAttrs: false,
      __fromReactSlot: true,
      render(createElement) {
        if (children instanceof Function) {
          children = children(this)
        }
        return createElement(options.react.slotWrap, { attrs, style }, children)
      },
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

  vueInReactCall(children, customOptions = {}, division) {
    if (division) {
      if (children && children[0]) {
        return children.map((child, index) => {
          return applyVueInReact(this.createSlot(child instanceof Function ? child: [child]), { ...options, ...customOptions, isSlots: true, wrapInstance }).render({key: child?.data?.key || index})
        })
      }
    }
    return applyVueInReact(this.createSlot(children), { ...options, ...customOptions, isSlots: true, wrapInstance }).render()
  }

  render() {
    let {
      children,
      "data-passed-props": __passedProps,
      hashList,
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
          props[i] = { ...applyVueInReact(this.createSlot(props[i]), { ...options, isSlots: true, wrapInstance }).render() }
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
        // 自定义插槽处理
        if (options.defaultSlotsFormatter){
          children = options.defaultSlotsFormatter(children, this.vueInReactCall, hashList)
          if (children instanceof Array) {
            children = [...children]
          } else {
            children = {...children}
          }
        } else {
          children = { ...applyVueInReact(this.createSlot(children), { ...options, isSlots: true, wrapInstance }).render() }
        }
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
    let finalProps = props
    // 自定义处理参数
    if (options.defaultPropsFormatter) {
      finalProps = options.defaultPropsFormatter(props, this.vueInReactCall)
    }
    const newProps = { ...finalProps, ...{ "data-passed-props": __passedProps } }
    if ((Object.getPrototypeOf(Component) !== Function.prototype && !(typeof Component === "object" && !Component.render)) || applyReact.catchVueRefs()) {
      return (
          <Component {...newProps}
                     {...{ "data-passed-props": __passedProps }} {...refInfo}>
            {children}
          </Component>
      )
    }
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
    originReactComponent: component,
    data() {
      return {
        portals: []
      }
    },
    created() {
      // this.vnodeData = this.$vnode.data
      this.cleanVnodeStyleClass()
      if (this.$root.$options.router) {
        vueRootInfo.router = this.$root.$options.router
      }
      if (this.$root.$options.router) {
        vueRootInfo.store = this.$root.$options.store
      }
    },
    props: ["dataPassedProps"],
    render(createElement) {
      this.slotsInit()
      const { style, ...attrs } = options.react.componentWrapAttrs
      return createElement(options.react.componentWrap, { ref: "react", attrs, style }, this.portals.map((Portal, index) => Portal(createElement, index)))
    },
    methods: {
      pushVuePortal(vuePortal) {
        this.portals.push(vuePortal)
      },
      // hack!!!! 一定要在render函数李触发，才能激活具名插槽
      slotsInit() {
        Object.keys(this.$slots).forEach((key) => {
          return this.$slots[key]
        })
        Object.keys(this.$scopedSlots).forEach((key) => {
          this.$scopedSlots[key]()
        })
      },
      updateLastVnodeData(vnode) {
        this.lastVnodeData = {
          style: { ...this.formatStyle(vnode.data.style), ...this.formatStyle(vnode.data.staticStyle) },
          class: Array.from(new Set([...this.formatClass(vnode.data.class), ...this.formatClass(vnode.data.staticClass)])).join(' '),
        }
        Object.assign(vnode.data, {
          staticStyle: null,
          style: null,
          staticClass: null,
          class: null,
        })
        return vnode
      },
      // 清除style和class，避免包囊层被污染
      cleanVnodeStyleClass() {
        let vnode = this.$vnode
        this.updateLastVnodeData(vnode)
        // 每次$vnode被修改，将vnode.data中的style、staticStyle、class、staticClass记下来并且清除
        Object.defineProperty(this, '$vnode', {
          get() {
            return vnode
          },
          set: (val) => {
            if (val === vnode) return vnode
            vnode = this.updateLastVnodeData(val)
            return vnode
          }
        })
      },
      toCamelCase(val) {
        const reg = /-(\w)/g
        return val.replace(reg, ($, $1) => $1.toUpperCase())
      },
      formatStyle(val) {
        if (!val) return {}
        if (typeof val === 'string') {
          val = val.trim()
          return val.split(/\s*;\s*/).reduce((prev, cur) => {
            if (!cur) {
              return prev
            }
            cur = cur.split(/\s*:\s*/)
            if (cur.length !== 2) return prev
            Object.assign(prev, {
              [this.toCamelCase(cur[0])]: cur[1],
            })
            return prev
          }, {})
        }
        if (typeof val === 'object') {
          const newVal = {}
          Object.keys(val).forEach((v) => {
            newVal[this.toCamelCase(v)] = val[v]
          })
          return newVal
        }
        return {}
      },
      formatClass(val) {
        if (!val) return []
        if (val instanceof Array) return val
        if (typeof val === 'string') {
          val = val.trim()
          return val.split(/\s+/)
        }
        if (typeof val === 'object') {
          return Object.keys(val).map((v) => (val[v] ? val[v]: ''))
        }
        return []
      },
      // 用多阶函数解决作用域插槽的传递问题
      getScopeSlot(slotFunction) {
        const _this = this
        function scopedSlotFunction(createReactSlot) {
          function getSlot(...args) {
            if (slotFunction.reactFunction) {
              return slotFunction.reactFunction.apply(this, args)
            }
            return applyVueInReact(createReactSlot(slotFunction.apply(this, args)), { ...options, isSlots: true, wrapInstance: _this }).render()
          }
          getSlot.vueFunction = slotFunction
          return getSlot
        }
        scopedSlotFunction.__scopedSlot = true
        return scopedSlotFunction
      },
      mountReactComponent(update, isChildrenUpdate) {
        // 先提取透传属性
        let {
          on: __passedPropsOn,
          $slots: __passedPropsSlots,
          $scopedSlots: __passedPropsScopedSlots,
          children,
          ...__passedPropsRest
        } = (this.$props.dataPassedProps != null ? this.$props.dataPassedProps : {})

        let normalSlots = {}
        let scopedSlots = {}
        if (!update || update && isChildrenUpdate) {
          // 处理具名插槽，将作为属性被传递

          const mergeSlots = { ...__passedPropsSlots, ...this.$slots }
          // 对插槽类型的属性做标记
          for (const i in mergeSlots) {
            normalSlots[i] = mergeSlots[i]
            normalSlots[i].__slot = true
          }
          // 对作用域插槽进行处理
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
        }

        // 预生成react组件的透传属性
        const __passedProps = {
          ...__passedPropsRest,
          ...{ ...this.$attrs },
          ...(!update || update && isChildrenUpdate ? {
            $slots: normalSlots,
            $scopedSlots: scopedSlots,
            children
          }: {}),
          on: { ...__passedPropsOn, ...this.$listeners },
        }
        let lastNormalSlots
        if (!update || update && isChildrenUpdate) {
          lastNormalSlots = { ...normalSlots }
          children = lastNormalSlots.default
          delete lastNormalSlots.default
        }

        // 获取style scoped生成的hash
        const hashMap = {}
        const hashList = []
        for (let i in this.$el.dataset) {
          if (this.$el.dataset.hasOwnProperty(i) && i.match(/v-[\da-zA-Z]+/)) {
            hashMap['data-' + i] = ''
            hashList.push('data-' + i)
          }
        }
        // 如果不传入组件，就作为更新
        if (!update) {
          const Component = createReactContainer(component, options, this)
          const reactEvent = {}
          Object.keys(__passedProps.on).forEach((key) => {
            reactEvent['on' + key.replace(/^(\w)/, ($, $1) => $1.toUpperCase())] = __passedProps.on[key]
          })
          let reactRootComponent = <Component
              {...__passedPropsRest}
              {...this.$attrs}
              //{...__passedProps.on}
              {...reactEvent}
              {...{ children }}
              {...lastNormalSlots}
              {...scopedSlots}
              {...{ "data-passed-props": __passedProps }}
              {...(this.lastVnodeData.class ? {className: this.lastVnodeData.class}: {})}
              {...hashMap}
              hashList={hashList}
              style={this.lastVnodeData.style}
              ref={(ref) => (this.reactInstance = ref)}
          />
          // 必须通过ReactReduxContext连接context
          if (this.$redux && this.$redux.store && this.$redux.ReactReduxContext) {
            const ReduxContext = this.$redux.ReactReduxContext
            reactRootComponent = <ReduxContext.Provider value={{ store: this.$redux.store }}>{reactRootComponent}</ReduxContext.Provider>
          }
          // 必须异步，等待包囊层的react实例完毕
          // this.$nextTick(() => {
          const container = this.$refs.react
          let reactWrapperRef = options.wrapInstance

          if (!reactWrapperRef) {
            let parentInstance = this.$parent
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
          } else {
            reactWrapperRef = options.wrapInstance
            reactWrapperRef.vueWrapperRef = this
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
            reactWrapperRef.pushReactPortal(this.reactPortal)
            return
          }

          const reactInstance = ReactDOM.render(
              reactRootComponent,
              container
          )
          // })
        } else {
          // 更新
          // Promise异步合并更新
          // if (!this.cache) {
          //   this.$nextTick(() => {
          //     this.reactInstance && this.reactInstance.setState(this.cache)
          //     this.cache = null
          //   })
          // }
          const reactEvent = {}
          Object.keys(this.$listeners).forEach((key) => {
            reactEvent['on' + key.replace(/^(\w)/, ($, $1) => $1.toUpperCase())] = this.$listeners[key]
          })
          this.cache = {...this.cache || {}, ...{
            ...__passedPropsRest,
            ...this.$attrs,
            // ...this.$listeners,
            ...reactEvent,
            ...(update && isChildrenUpdate ? {
              children,
              ...lastNormalSlots,
              ...scopedSlots,
            }: {}),
            ...{ "data-passed-props": __passedProps },
            ...(this.lastVnodeData.class ? {className: this.lastVnodeData.class}: {}),
            ...{...hashMap},
            style: this.lastVnodeData.style,
          }}
          this.reactInstance && this.reactInstance.setState(this.cache)
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
        this.parentReactWrapperRef.vueRef && this.parentReactWrapperRef.setState({ portals })
        return
      }
      // 删除根节点
      ReactDOM.unmountComponentAtNode(this.$refs.react)
    },
    updated() {
      this.mountReactComponent(true, true)
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
