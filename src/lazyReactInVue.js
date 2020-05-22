import applyReactInVue from './applyReactInVue'
export default function lazyReactInVue (asyncImport) {
  return () => asyncImport().then((mod) => {
    return applyReactInVue(mod.default)
  })
}
