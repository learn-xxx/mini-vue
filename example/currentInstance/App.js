import { h, getCurrentInstance } from '../../lib/mini-vue.esm.js';

export const App = {
  render() {
    return h('div', {}, [h("p", {}, "Current instance")]);
  },
  setup() {
    const instance = getCurrentInstance();
    console.log("App: ", instance);
    return { instance }
  }
}
