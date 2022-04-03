import { ref } from "../../lib/mini-vue.esm.js"
export const App = {
  name: 'App',
  template: `<div>hi,{{count}}</div>`,
  setup() {
    const count = (window.count = ref(0))
    return {
      count 
    }
  }
}
