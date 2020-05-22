import React from 'react'
import Vue from 'vue'

import applyReactInVue from './applyReactInVue'
import vueRootInfo from './vueRootInfo'
import { reactRouterInfo, setReactRouterInVue, updateReactRouterInVue } from './applyReactRouterInVue'
// 根据传入的是否是字符串，判断是否需要获取Vue的全局组件
function filterVueComponent (component) {
  if (typeof component === 'string') {
    return Vue.component(component)
  }
  return component
}
// 获取组件选项对象
function getOptions (Component) {
  if (typeof Component === 'function') {
    // return new (Component)().$options
    return Component.options
  }
  return Component
}
// 利用多阶组件来获取reactRouter
class GetReactRouterPropsCom extends React.Component {
  constructor (props) {
    super(props)
    let { history, match, location, forwardRef, ...newProps } = props
    this.state = {
      ...newProps
    }
    // 设置react router属性绑定倒所有的vue的原型上
    setReactRouterInVue({
      history,
      match,
      location
    })
  }
  componentWillReceiveProps (nextProps) {
    let { history, match, location } = nextProps
    updateReactRouterInVue({
      history,
      match,
      location
    })
  }
  render () {
    return <VueComponentLoader {...this.state} ref={ this.props.forwardRef } />
  }
}
const VueContainer = React.forwardRef((props, ref) => {
  // 判断是否获取过reactRouter
  if (reactRouterInfo.withRouter) {
    const TargetComponent = reactRouterInfo.withRouter(GetReactRouterPropsCom)
    // withRouter方法是通过wrappedComponentRef来传递ref的
    return (
      <TargetComponent {...props} forwardRef={ref} />
    )
  } else {
    return <VueComponentLoader {...props} ref={ref}/>
  }
})
export {
  VueContainer
}
class VueComponentLoader extends React.Component {
  constructor (props) {
    super(props)
    // 捕获vue组件
    this.currentVueComponent = filterVueComponent(props.component)
    this.createVueInstance = this.createVueInstance.bind(this)
  }

  componentWillReceiveProps (nextProps) {
    let { component, ...props } = nextProps
    component = filterVueComponent(component)
    if (this.currentVueComponent !== component) {
      this.updateVueComponent(component)
    }
    // 更改vue组件的data
    Object.assign(this.vueInstance.$data, this.doVModel(props))
  }

  componentWillUnmount () {
    this.vueInstance.$destroy()
  }

  // 处理v-model
  doVModel (props) {
    let { $model, ...newProps } = props
    if ($model === undefined) return props
    // 考虑到了自定义v-model
    let vueInstanceModelOption = { ...{ prop: 'value', event: 'input' }, ...getOptions(this.currentVueComponent).model }
    let modelProp = { [vueInstanceModelOption.prop]: $model.value }
    // 如果有绑定的事件和v-model事件相同，需合并两个绑定函数
    if (!newProps.on) newProps.on = {}
    if (newProps.on[vueInstanceModelOption.event]) {
      let oldFun = newProps.on[vueInstanceModelOption.event]
      newProps.on[vueInstanceModelOption.event] = function (...args) {
        oldFun.apply(this, args)
        $model.setter && $model.setter.apply(this, args)
      }
    } else {
      newProps.on = { ...newProps.on, ...{ [vueInstanceModelOption.event]: $model.setter || (() => {}) } }
    }
    return { ...newProps, ...modelProp }
  }

  // 处理sync
  doSync (props) {
    let { $sync, ...newProps } = props
    if ($sync === undefined) return props
    const syncValues = {}
    for (let i in $sync) {
      if (!$sync.hasOwnProperty(i) || !$sync[i] || $sync[i].value == null || $sync[i].setter == null) continue
      syncValues[i] = $sync[i].value
      let syncEvent = 'update:' + i
      // 如果有绑定的事件和sync事件相同，需合并两个绑定函数
      if (!newProps.on) newProps.on = {}
      if (newProps.on[syncEvent]) {
        let oldFun = newProps.on[syncEvent]
        newProps.on[syncEvent] = function (...args) {
          oldFun.apply(this, args)
          $sync[i].setter && $sync[i].setter.apply(this, args)
        }
      } else {
        newProps.on = { ...newProps.on, ...{ [syncEvent]: $sync[i].setter || (() => {}) } }
      }
    }
    return { ...newProps, ...syncValues }
  }
  // 将通过react组件的ref回调方式接收组件的dom对象，并且在class的constructor中已经绑定了上下文
  createVueInstance (targetElement) {
    const VueContainerInstance = this
    let { component, 'data-passed-props': __passedProps = {}, ...props } = this.props
    component = filterVueComponent(component)
    // 过滤vue组件实例化后的$attrs
    let filterAttrs = (props) => {
      // 对mixin进行合并
      let mixinsPropsArray = []
      let mixinsPropsJson = {}
      // 这一步我暂时没有想到更好的方案
      let componentOptions = getOptions(this.currentVueComponent)
      if (componentOptions.mixins) {
        componentOptions.mixins.forEach((v) => {
          if (v.props) {
            if (v.props instanceof Array) {
              mixinsPropsArray = [...v.props]
            } else {
              mixinsPropsJson = { ...v.props }
            }
          }
        })
      }

      let attrs = Object.assign({}, props)
      let optionProps = componentOptions.props
      if (optionProps) {
        if (optionProps instanceof Array) {
          let tempArr = [...optionProps, ...mixinsPropsArray]
          tempArr.forEach((v) => {
            delete attrs[v]
          })
        } else {
          let tempJson = { ...optionProps, ...mixinsPropsJson }
          for (let i in tempJson) {
            if (!tempJson.hasOwnProperty(i)) continue
            delete attrs[i]
          }
        }
      }
      return attrs
    }
    // 获取作用域插槽
    // 将react组件传入的$scopedSlots属性逐个转成vue组件
    let getScopedSlots = (createElement, $scopedSlots) => {
      let tempScopedSlots = { ...$scopedSlots }
      for (let i in tempScopedSlots) {
        if (!tempScopedSlots.hasOwnProperty(i)) continue
        let reactFunction = tempScopedSlots[i]
        tempScopedSlots[i] = ((scopedSlot) => {
          return (context) => {
            if (scopedSlot.vueFunction) {
              return scopedSlot.vueFunction(context)
            } else {
              return createElement(applyReactInVue(() => scopedSlot(context)))
            }
          }
        })(reactFunction)
        tempScopedSlots[i].reactFunction = reactFunction
      }
      return tempScopedSlots
    }
    // 获取具名插槽
    // 将react组件传入的$slots属性逐个转成vue组件，但是透传的插槽不做处理
    let getNamespaceSlots = (createElement, $slots) => {
      let tempSlots = Object.assign({}, $slots)
      for (let i in tempSlots) {
        if (!tempSlots.hasOwnProperty(i) || !tempSlots[i]) continue
        tempSlots[i] = ((slot, slotName) => {
          if (slot.vueSlot) {
            return slot.vueSlot
          }
          let newSlot = [createElement(applyReactInVue(() => slot), { slot: slotName })]
          newSlot.reactSlot = slot
          return newSlot
        })(tempSlots[i], i)
      }
      return tempSlots
    }
    // 获取插槽整体数据
    // children是react jsx的插槽，需要使用applyReactInVue转换成vue的组件选项对象
    let getChildren = (createElement, children) => {
      // 这里要做判断，否则没有普通插槽传入，vue组件又设置了slot，会报错
      if (children != null) {
        if (children.vueSlot) {
          return children.vueSlot
        }
        let newSlot = [createElement(applyReactInVue(() => children))]
        newSlot.reactSlot = children
        return newSlot
      }
    }
    // 从作用域插槽中过滤具名插槽
    let filterNamedSlots = (scopedSlots, slots) => {
      if (!scopedSlots) return {}
      if (!slots) return scopedSlots
      for (let i in scopedSlots) {
        if (!scopedSlots.hasOwnProperty(i)) continue
        if (slots[i]) delete scopedSlots[i]
      }
      return scopedSlots
    }
    // 将vue组件的inheritAttrs设置为false，以便组件可以顺利拿到任何类型的attrs
    // 这一步不确定是否多余，但是vue默认是true，导致属性如果是函数，又不在props中，会出警告，正常都需要在组件内部自己去设置false
    // component.inheritAttrs = false
    // 创建vue实例
    this.vueInstance = new Vue({
      ...vueRootInfo,
      el: targetElement,
      data: { ...this.doSync(this.doVModel(props)), 'data-passed-props': __passedProps },
      mounted () {
        // 在react包囊实例中，使用vueRef保存vue的目标组件实例
        VueContainerInstance.vueRef = this.$children[0]
        // 在vue的目标组件实例中，使用reactWrapperRef保存react包囊实例，vue组件可以通过这个属性来判断是否被包囊使用
        this.$children[0].reactWrapperRef = VueContainerInstance
      },
      beforeDestroy () {
        // 垃圾回收
        VueContainerInstance.vueRef = null
        this.$children[0].reactWrapperRef = null
      },
      render (createElement) {
        // 这里很重要，将不是属性的内容过滤掉，并单独抽取
        let { component,
          on,
          $slots,
          $scopedSlots,
          children,
          'class': className = '',
          style = '',
          'data-passed-props': {
            $slots: __passedPropsSlots,
            $scopedSlots: __passedPropsScopedSlots,
            children: __passedPropsChildren,
            on: __passedPropsOn,
            ...__passedPropsRest
          }, ...props } = this.$data
        filterNamedSlots(__passedPropsScopedSlots, __passedPropsSlots)
        // 作用域插槽的处理
        let scopedSlots = getScopedSlots(createElement, { ...__passedPropsScopedSlots, ...$scopedSlots })
        let lastChildren = getChildren(createElement, this.children || __passedPropsChildren)
        // 获取插槽数据（包含了具名插槽）
        let namedSlots = getNamespaceSlots(createElement, { ...__passedPropsSlots, ...$slots })
        if (lastChildren) namedSlots.default = lastChildren
        let lastSlots = [
          (lastChildren || []),
          ...Object.keys(namedSlots).map((key) => {
            if (key === 'default') {
              return
            }
            return namedSlots[key]
          })
        ]
        let lastOn = { ...__passedPropsOn, ...on }
        let lastProps = {
          ...__passedPropsRest,
          ...props,
          // 封装透传属性
          'data-passed-props': {
            ...__passedPropsRest,
            ...props,
            on: lastOn,
            children: lastChildren,
            $slots: namedSlots,
            $scopedSlots: scopedSlots
          }
        }
        // 手动把props丛attrs中去除，
        // 这一步有点繁琐，但是又必须得处理
        let attrs = filterAttrs({ ...lastProps })
        return createElement(
          'use_vue_wrapper',
          {
            props: lastProps,
            on: lastOn,
            attrs,
            'class': className,
            style,
            scopedSlots: { ...scopedSlots }
          },
          lastSlots
        )
      },
      components: {
        'use_vue_wrapper': component
      }
    })
  }

  updateVueComponent (nextComponent) {
    this.currentVueComponent = nextComponent

    // 使用$forceUpdate强制重新渲染vue实例，因为此方法只会重新渲染当前实例和插槽，不会重新渲染子组件，所以不会造成性能问题
    // $options.components包含了vue实例中所对应的组件序列, $option是只读,但是确实可以修改components属性,依靠此实现了动态组件替换
    this.vueInstance.$options.components.use_vue_wrapper = nextComponent
    this.vueInstance.$forceUpdate()
  }

  render () {
    return <div data-use-vue-component-wrap=""><div ref={this.createVueInstance} /></div>
  }
}

export default function applyVueInReact (component) {
  // 兼容esModule
  if (component.__esModule && component.default) {
    component = component.default
  }
  // return props => <VueContainer {...props} component={component} />
  // 使用React.forwardRef之后，组件不再是函数组件，如果使用applyVueInReact处理插槽vue的插槽，需要直接调用返回对象的render方法
  return React.forwardRef((props, ref) => (
    <VueContainer {...props} component={component} ref={ref}/>
  ))
}
