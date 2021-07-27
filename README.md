# Vue和React快捷集成的工具包，并且适合复杂的集成场景 
<div align=center>
  <img src="https://raw.githubusercontent.com/devilwjp/VueReact/master/vuereact-combined.png"/>
</div>  

<div align=center>
  <p>
  <h4>可以在任何的Vue和React项目中使用另一个类型框架的组件，并且解决了复杂的集成问题 </h4>
  <p>
</div>  

## 安装  
````  
npm i vuereact-combined -S
````  

## Why?  
#### 让vue和react的同学们一起来完成同一个项目同一个页面甚至同一个组件  
+ 使项目的人员选择性和机动性变得更强，vue和react的技术栈都可以加入项目   
+ 使项目的第三方插件选择性更强，vue和react的插件都可以通用  
+ 使研发人员的技术交流性更强，研发人员不应该被技术栈所限制  
+ 使项目可以集成更多的业务代码，其他vue和react项目的优秀代码可以快速引入  
+ 使前端研发人员可以更好的学习vue和react，了解两者的精华，促进团队在前端技术栈的广度  
+ 使用方式极其简便  
## benchmark
非常感谢vuera的存在，开辟了Vue和React融合的想法，但是vuera只能解决非常基础的组件融合，并且存在插槽(children)和数据变更后的渲染性能问题，因此无法用于复杂的场景以及生产环境  
vuereact-combined将融合做到了极致，支持了大部分的Vue和React组件的功能，并且在渲染更新上使用了和vuera不同的思路，完美解决了渲染性能问题  
场景/功能 | vuereact-combined | vuera  
-|-|-  
normal prop (vue / react) | ✔ | ✔ |  
event (vue / react) | ✔ | ✔ |  
children (vue / react) | ✔ | ✔ |  
named slots (vue) | ✔ |  |  
scope slots (vue) | ✔ |  |  
v-model (vue) | ✔ |  |  
sync (vue) | ✔ |  |  
render props (react) | ✔ |  |  
node props (react) | ✔ |  |  
enter & leave 事件委托传递 (react) | ✔ |  |  
slots & children & node在父组件数据变更后的生命周期表现 | 触发更新 | 每次都触发创建和销毁 |  
vuex in react | ✔ |  |  
vue-router in react | ✔ |  |  
redux in vue | ✔ |  |  
react-router in react | ✔ |  |  
lazyReactInVue | ✔ |  |  
lazyVueInReact | ✔ |  |  
第三方组件跨框架使用（比如antd、element） | 支持所有第三方组件 | 基本不支持 |  
自定义融合包囊层的dom attr | ✔ |  |  
## 只是高阶组件  
````vue
<!--Vue File-->
<template>
  <Popover content="I am React Popover" title="Title">
    <Button type="primary">It's Vue Button</Button>
  </Popover>
</template>

<script>
import { applyReactInVue } from 'vuereact-combined'
// antd React
import { Popover } from 'antd'
// element-ui Vue
import { Button } from 'element-ui'

export default {
  components: {
    // 使用applyReactInVue高阶组件将antd Popover转换成Vue组件
    Popover: applyReactInVue(Popover),
    Button,
  },
}
</script>

<style scoped>

</style>
````  
````jsx
// React JSX File
import React, { useState } from 'react'
// element-ui DatePicker Vue
import { DatePicker } from 'element-ui'
import { applyVueInReact } from 'vuereact-combined'

// 使用applyVueInReact高阶组件讲element-ui DatePicker转换成React组件
const ElDatePicker = applyVueInReact(DatePicker)
export default function() {
  const [timeValue, setTimeValue] = useState(Date.now())
  return <ElDatePicker
    {/* Vue组件的v-model在React中的用法 */}
    $model={{
        value: timeValue,
        setter: (val) => { setTimeValue(val) },
    }}
    type="date"
    placeholder="选择日期"/>
}

````
## 使用场景
最基本的，项目中至少应该存在`vue@^2.6`、`react@^16.3`、`react-dom@^16.3`  
### Vue项目中使用第三方的React组件  
第三方的react组件已经是通过`babel`进行过处理，不包含React的`jsx`  
此情况下，可以直接在项目中使用applyReactInVue对第三方的React组件进行处理  
### React项目中使用第三方的Vue组件  
第三方的Vue组件已经是通过`vue-loader`和`babel`进行过处理，不包含`.vue`文件以及Vue的`jsx`  
此情况下，可以直接在项目中使用applyVueInReact对第三方的Vue组件进行处理  
### 复杂情况(项目中同时安装和配置react和vue的相关环境)  
此情况可以在一个项目中同时开发编写React和Vue的组件代码，由于需要同时具备两种技术栈所依赖的环境，因此需要对项目的构建（一般是`webpack`的配置）和`babel.config.js`进行一些配置上的修改  
可以参考以下案例  
+ 如果是通过vue-cli3创建的项目  
请参考 https://github.com/devilwjp/vuereact-for-vuecli3-demo
+ 如果通过react-create-app创建的项目（react版本需要>=16.3）  
请参考 https://github.com/devilwjp/vuereact-for-cra-demo  
  
## 属性传递  
在React中正常的使用React的方式向Vue组件传递属性和children
````jsx
// React JSX File
import React, { useState } from 'react'
// element-ui Vue
import { Button, ButtonGroup } from 'element-ui'
import { applyVueInReact } from 'vuereact-combined'

const ElButton = applyVueInReact(Button)
const ElButtonGroup = applyVueInReact(ButtonGroup)

export default function() {
    
  const [type, setType] = useState('primary')
  const [disabled, setDisabled] = useState(false)
  const [content, setContent] = useState('提交')
    
  return <ElButtonGroup>
    <ElButton type="danger" disabled>提交</ElButton>
    <ElButton type={type} disabled={disabled}>提交</ElButton>
    <ElButton type="danger">{content}</ElButton>
  </ElButtonGroup>
}
````  
在Vue中正常的使用Vue的方式向React组件传递属性和插槽  
````vue
<!--Vue File-->
<template>
  <Popover :content="content" :title="title">
    {{popoverChildren}}
  </Popover>
</template>

<script>
import { applyReactInVue } from 'vuereact-combined'
// antd React
import { Popover } from 'antd'

export default {
  data() {
    return {
      content: 'I am React Popover',
      title: 'Title',
      popoverChildren: `hover me!`,
    }
  },
  components: {
    // 使用applyReactInVue高阶组件将antd Popover转换成Vue组件
    Popover: applyReactInVue(Popover)
  },
}
</script>

<style scoped>

</style>
````  
## 在React中使用Vue组件的v-model和sync修饰符
````jsx
// React JSX File
import React, { useState } from 'react'
// element-ui DatePicker Vue
import { DatePicker } from 'element-ui'
// 一个开放sync修饰符属性的Vue组件
import VueComponent from './VueComponent.vue'
import { applyVueInReact } from 'vuereact-combined'

const ElDatePicker = applyVueInReact(DatePicker)
const VueComponentInReact = applyVueInReact(VueComponent)

export default function() {
  const [timeValue, setTimeValue] = useState(Date.now())
  const [timeValue1, setTimeValue1] = useState(Date.now())
  // Vue组件的v-model在React中的用法
  const $model = {
    value: timeValue,
    setter: (val) => { setTimeValue(val) },
  }
  // Vue组件的sync在React中的用法
  const $sync = {
    props1: {
      value: timeValue1,
      setter: (val) => { setTimeValue1(val) },
    }
  }
  return <div>
    <ElDatePicker $model={$model} type="date" placeholder="选择日期"/>
    <VueComponentInReact $sync={$sync} />
  </div>
}
````  
使用`$model`属性传递一个对象  
`$model`  
**Type:** `{value: state, setter: (val: nextState) => void}`  
其中`value`就是要传入给v-model的状态值，`setter`就是子组件向父组件发出修改状态值的触发函数，这个函数应该是个纯函数，不应该包含其他逻辑，确保函数内容仅仅只用于修改状态值  
`$sync`  
**Type:** `{[propName: {value: state, setter: (val: nextState) => void}]}`  

## 在React中使用Vue组件的作用域插槽和具名插槽  
```jsx
// React JSX File
import React, { useState } from 'react'
// 一个开放具名插槽和作用域插槽的vue组件
import VueComponent from './VueComponent.vue'
import { applyVueInReact } from 'vuereact-combined'

const VueComponentInReact = applyVueInReact(VueComponent)
export default function() {
  // 具名插槽
  const $slots = {
      slotA: <div>具名插槽A</div>,
      slotB: <div>具名插槽B</div>
  }
  // 作用域插槽
  const $scopedSlots = {
      slotC: (context) => <div>我是作用域插槽C：{context.value}</div>
  }
  return <div>
    <VueComponentInReact $slots={$slots} $scopedSlots={$scopedSlots}>
      <h1>我是普通的插槽</h1>
    </VueComponentInReact>
  </div>
}
```  
`$slots` 具名插槽属性  
**Type:** {[slotName: string]: ReactNode}  
`$scopedSlots` 作用域插槽属性  
**Type:** {[slotName: string]: (context: RenderPropsContext) => ReactElement | ReactComponent}  
## 在Vue组件中向React组件传递ReactNode类型的属性和renderProps类型的属性  
```vue
<!--Vue File-->
<template>
  <ReactComponentInVue>
    我是普通children
    <template v-slot:slotA>
      我是ReactNode类型的slotA属性
    </template>
    <template v-slot:slotB>
      我是ReactNode类型的slotB属性
    </template>
    <template v-slot:slotC="context">
      我是renderProps类型：{{context.value}}
    </template>
  </ReactComponentInVue>
</template>

<script>
import { applyReactInVue } from 'vuereact-combined'
// 一个开放ReactNode类型属性和renderProps类型属性的React组件
import ReactComponent from './ReactComponent'
export default {
  name: 'demo2',
  components: {
    ReactComponentInVue: applyReactInVue(ReactComponent)
  }
}
</script>
```  
applyReactInVue会将ReactNode类型的属性转会为Vue的具名插槽，将renderProps类型的属性转换为作用域插槽，具名插槽和作用域插槽的插槽名就是属性名  
## 在React组件中使用Vue的动态组件
```jsx
// React JSX File
import React, { useState, useEffect } from 'react'
import VueComponent1 from './VueComponent1.vue'
import VueComponent2 from './VueComponent2.vue'
import { VueContainer } from 'vuereact-combined'

const ElButton = applyVueInReact(Button)
const ElButtonGroup = applyVueInReact(ButtonGroup)

export default function() {
  const [vueComponent, setVueComponent] = useState(VueComponent1)
  useEffect(() => {
    // 3秒之后换成VueComponent2组件
    setTimeout(() => {
      setVueComponent(VueComponent2)
    }, 3000)
  }, [])
  const prop1 = '属性1'
  const prop2 = '属性2'
  return <VueContainer component={vueComponent} prop1={prop1} prop2={prop2}/>
}
```  
VueContainer是一个高阶组件，通过component属性直接渲染Vue组件  
## applyRedux
作用：使得所有的Vue组件可以使用redux的状态管理
对工具包开启redux状态管理，这个场景一般存在于以React为主的项目中，为了使Vue组件也可以共享到redux，需要在项目的入口文件引入applyRedux方法（整个项目应该只引一次），将redux的store以及redux的context作为参数传入（或者至少在redux的Provider高阶组件引入的地方使用applyRedux方法）
````js  
// 第二个参数是redux的context，之所以需要传第二个参数，是因为有如下场景
// Provider -> ReactCom1 -> VueCom1 -> ReactCom2
// Provider无法直接透过Vue组件传递给之后的React组件，所以applyRedux提供了第二个参数，作用就是可以使通过Vue组件之后的React组件继续可以获取到redux的context
import { ReactReduxContext } from 'react-redux'
import store from '../reactComponents/reduxStore'
applyRedux({ store, ReactReduxContext })
````  
#### store.js
````js  
// 原生的redux store的创建方式
import { createStore } from 'redux'
import someCombineReducer from './reducer' // 建议通过react-redux的combineReducer输出
let store = createStore(someCombineReducer)
export default store
````  
React组件连接redux的方式这里就不再做介绍了，应该使用react-redux的connect方法  
这里介绍Vue组件如何使用redux，工具包尽可能的实现了vue组件使用vuex的方式去使用redux，通过vm.$redux可以在组件实例里获取到redux状态管理
````html  
<template>
  <div>
    redux状态testState1: {{$redux.state.testState1}}
  </div>
</template>

<script>
export default {
  name: 'demo3',
  mounted () {
    // 打印redux的testState2状态值
    console.log(this.$redux.state.testState2)
    // 五秒后将testState1修改成8888
    // 需要在reducer里存在一个action的type为test1可以修改testState1
    // 这里需要按照标准的redux的action标准（必须有type）触发dispatch
    setTimeout(() => {
      this.$redux.dispatch({
        type: 'test1',
        value: 8888
      })
    }, 5000)
  }
}
</script>
````  

## applyVuex
作用：使得所有的Redux组件可以使用Vuex的状态管理  
对工具包开启vuex状态管理，这个场景一般存在于以Vue为主的项目中，为了使React组件也可以共享到vuex，需要在项目的入口文件引入applyVuex方法（整个项目应该只引一次），将vuex的store作为参数传入
````js  
import store from '../store' // vuex的store文件
applyVuex(store)
````  

## connectVuex
类似react-redux的connect方法，在React组件中使用，由于vuex的关键字比redux多，所以将参数改成了对象，包含了mapStateToProps、mapCommitToProps、mapGettersToProps、mapDispatchToProps，每个都是一个纯函数，返回一个对象（和redux的connect使用方式完全一致）
````js  
export default connectVuex({
  mapStateToProps (state) {
    return {
      vuexState: state,
      state1: state.state1,
      moduleAstate: state.moduleA
    }
  },
  mapCommitToProps (commit) {
    return {
      vuexCommit: commit
    }
  },
  // mapGettersToProps = (getters) => {},
  // mapDispatchToProps = (dispatch) => {},
})(ReactComponent)
````  

## lazyVueInReact
在React的router里懒加载Vue组件
````jsx harmony  
import React, { lazy, Suspense } from "react"
import { lazyVueInReact } from 'vuereact-combined'
const Hello = lazy(() => import("./react_app/hello"));
//懒加载vue组件
const TestVue = lazyVueInReact(() => import("./vue_app/test.vue"))


export default [
{
    path: "/reactHello",
    component: () => {
        return (
            <Suspense fallback={<div>Loading...</div>}>
                <Hello />
            </Suspense>
        );
    }
},
{
    path: "/vuetest1",
    component: () => {
        return (
            <Suspense fallback={<div>Loading...</div>}>
                <div>
                    <h1>我是一个vue组件</h1>
                    <TestVue />
                </div>
            </Suspense>
        );
    }
}]
````  

## lazyReactInVue
在Vue的router里懒加载React组件
````js
import Vue from 'vue'
import VueRouter from 'vue-router'
import { lazyReactInVue } from 'vuereact-combined'
Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home')
  },
  {
    path: '/reactInVueDemo',
    name: 'reactInVueDemo',
    component: lazyReactInVue(() => import('../reactComponents/cc.jsx'))
  }
]

const router = new VueRouter({
  routes
})

export default router
````  

## withVueRouter
在react组件中获取vue router对象，可以通过props属性获取倒$vueRouter和$vueRoute
```jsx harmony
import React from 'react'
import { withVueRouter } from 'vuereact-combined'
class Test2 extends React.Component {
  constructor (props) {
    super(props)
  }
  componentWillMount () {

  }
  componentDidMount () {
    // 可以通过props属性获取倒$vueRouter和$vueRoute
    console.log(this.props.$vueRouter, this.props.$vueRoute)
  }

  render () {
    return (
      <div>
        test2
        <h3>{this.props.$vueRoute.query.b}</h3>
      </div>
    )
  }
}
export default withVueRouter(Test2)
```  

## applyReactRouterInVue
建议在react项目的app或者main引入，然后再任何一个被转换的vue组件中都可以直接获取到实例属性$reactRouter,其中包含了react router的history、location、match
#### app.jsx
```jsx harmony
import { applyReactRouterInVue } from 'vuereact-combined'
import { withRouter } from 'react-router-dom'
applyReactRouterInVue(withRouter)
```  
#### demo.vue
```vue
<template>
    <div>
      <h1>demo</h1>
      <h2>{{$reactRouter.location.search}}</h2>
    </div>
</template>

<script>
export default {
  mounted () {
  }
}
</script>
```  
## 需要注意的包囊性问题  
由于在每一次跨越一个框架进行组件引用时，都会出现一层包囊，这个包囊是默认是以div呈现，并且会被特殊属性标注
React->Vue，会在vue组件的dom元素外包囊一层标识data-use-vue-component-wrap的div
Vue->React，会在react组件的dom元素外包囊一层标识__use_react_component_wrap的div
如果引发样式问题，可以对applyVueInReact、applyReactInVue方法传入第二个参数`options`  
```jsx
import VueComponent from './VueComponent.vue'
import { applyVueInReact } from 'vuereact-combined'
const VueComponentInReact = applyVueInReact(VueComponent, {
  react: {
    // react.componentWrapAttrs代表是vue组件在react组件中的组件包囊层的标签设置
    // 以下设置将设置组件的包囊层div的display为inline-block
    componentWrapAttrs: {
      style: 'display:inline-block',
      class: 'react-wrap-vue-component-1'
    },
    // react.slotWrapAttrs代表是vue组件在react组件中的插槽包囊层的标签设置
    // 以下设置将设置插槽的包囊层div的display为inline-block
    slotWrapAttrs: {
      style: 'display:inline-block'
    },
  },
})
```
以下是默认配置
```jsx
// 默认配置
const originOptions = {
    react: {
        componentWrap: 'div',
        slotWrap: 'div',
        componentWrapAttrs: {
            __use_react_component_wrap: '',
        },
        slotWrapAttrs: {
            __use_react_slot_wrap: '',
        }
    },
    vue: {
        // 组件wrapper
        componentWrapHOC: (VueComponentMountAt, nativeProps = []) => {
            // 传入portals
            return function ({ portals = [] } = {}) {
                return (<div {...nativeProps}>{VueComponentMountAt}{portals.map((Portal, index) => <Portal key={index}/>)}</div>)
            }
        },
        componentWrapAttrs: {
            'data-use-vue-component-wrap': '',
        },
        slotWrapAttrs: {
            'data-use-vue-slot-wrap': '',
        }
    }
}
```  
## 支持程度  
#### 在react组件中引入vue组件  
功能 | 支持程度 |  说明  
-|-|-  
普通属性 | 完全支持 |  |  
html片段属性 | 变向支持 | 通过$slots，在vue中使用具名插槽获取 | 
render props | 变向支持 | 通过$scopedSlots，在vue中使用作用域插槽获取 |  
children(普通插槽) | 完全支持 |  |  
组件合成事件 | 完全支持 | 通过on属性 |  
组件原生事件(.native) | 不支持 | react没有这种感念，可以自己包囊div |  
v-model | 变向支持 | 通过$model，并且支持vue组件中随意自定义model属性 |  
context传入vue | 暂不支持 | 未来会支持，当前只有在vue中使用redux做了polyfill |  
html片段中使用react或者vue组件 | 完全支持 | react组件直接传入，vue组件继续通过applyVueInReact转换 |  
懒加载vue组件 | 完全支持 | 通过lazyVueInReact |  
redux共享 | 完全支持 | 使用applyRedux |  
mobx共享 | 变向支持 | mobx本身就有react和vue的连接方式 |  
vuex共享 | 完全支持 | 使用applyVuex |  
sync装饰 | 变向支持 | 使用$sync |  
事件修饰(key.enter、click.once) | 不支持 | 自行处理 |  
透传 | 变向支持 | 使用data-passed-props |  
ref | 变向支持 | ref首先会返回包囊实例的，在包囊实例中的属性vueRef可以获取倒vue组件实例 |  
react router(在vue组件中) | 完全支持 | 使用applyReactRouterInVue |  
判断自身是否被转化 | 完全支持 | 通过props属性data-passed-props或者实例属性reactWrapperRef |  

#### 在vue组件中引入react组件  
功能 | 支持程度 |  说明  
-|-|-  
普通属性 | 完全支持 |  |  
具名插槽 | 完全支持 | 在react中使用属性获取 | 
作用域插槽 | 完全支持 | 在react中使用属性获取，类型是个函数 |  
普通插槽 | 完全支持 |  |  
组件合成事件 | 完全支持 | 在react中使用属性获取 |  
组件原生事件(.native) | 暂不支持 |  |  
v-model | 不支持 | react组件没有这个概念 |  
provider/inject传入react | 暂不支持 | 未来会支持 |  
sync装饰 | 不支持 | react组件没有这个概念 |  
redux共享 | 完全支持 | 使用applyRedux |  
mobx共享 | 变向支持 | mobx本身就有react和vue的连接方式 |  
vuex共享 | 完全支持 | 使用applyVuex |  
事件修饰(key.enter、click.once) | 不支持 | react组件没有这个概念 |  
懒加载react组件 | 完全支持 | 通过lazyReactInVue |  
透传 | 变向支持 | 使用data-passed-props |  
ref | 变向支持 | ref首先会返回包囊实例的，在包囊实例中的属性reactRef可以获取倒react组件实例 |  
vue router(在react组件中) | 完全支持 | 使用withVueRouter |  
判断自身是否被转化 | 完全支持 | 通过props属性data-passed-props或者实例属性vueWrapperRef |    
