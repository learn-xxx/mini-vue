import { ref } from "../../lib/mini-vue.esm.js"
export const App = {
  name: 'App',
  template: `<div>hi,{{message}}</div>`,
  setup() {
    const message = (window.message = ref('mini-vue'))
    window.handleClick = ()=>{
      message.value = 'yeah!'
    }
    return {
      message 
    }
  }
}
