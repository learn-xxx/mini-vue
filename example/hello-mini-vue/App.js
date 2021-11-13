import { h } from "../../lib/mini-vue.esm.js";
window.self = null;
export const App = {
  render() {
    window.self = this;
    return h("div", {}, "hi! " + this.msg);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
