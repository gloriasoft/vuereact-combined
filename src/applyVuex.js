import React from 'react'
import vueRootInfo from './vueRootInfo'
let vuexStore
export function connectVuex ({ mapStateToProps = (state) => {}, mapGettersToProps = (getters) => {}, mapCommitToProps = (commit) => {}, mapDispatchToProps = (dispatch) => {} }) {
  return function (Component) {
    class VuexCom extends React.Component {
      constructor (props) {
        super(props)
        if (vueRootInfo.store) {
          vuexStore = vueRootInfo.store
        }
        if (!vuexStore || !vuexStore.state || !vuexStore.subscribe || !vuexStore.dispatch || !vuexStore.commit) {
          throw Error('[vuereact-combined warn]Error: incorrect store passed in, please check the function applyVuex\'s parameter must be vuex store')
        }
        this.state = {...mapStateToProps(vuexStore.state), ...mapGettersToProps(vuexStore.getters)}
      }
      componentDidMount () {
        // 订阅
        this.watch = vuexStore.watch(function() {
          return {...mapStateToProps(vuexStore.state), ...mapGettersToProps(vuexStore.getters)}
        }, (newVal) => {
          this.setState(newVal)
        }, {
          deep: true
        })
      }
      componentWillUnmount () {
        // 停止订阅
        this.watch()
      }
      render () {
        return (
          <Component {...this.props} {...{...this.state, ...mapCommitToProps(vuexStore.commit), ...mapDispatchToProps(vuexStore.dispatch) }} ref={this.props.forwardedRef}/>
        )
      }
    }
    // 转发ref
    return React.forwardRef((props, ref) => (
      <VuexCom forwardedRef={ref} {...props} />
    ))
  }
}

export default function applyVuex (store) {
  vuexStore = store
}
