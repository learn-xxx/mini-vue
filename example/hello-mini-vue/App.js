import { h } from "../../lib/mini-vue.esm.js";

export const App = {
  render() {
    return h("div", {}, [
      h("p", { class: "red" }, "hhh"),
      h("p", { class: "green" }, "hhh"),
    ]);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
