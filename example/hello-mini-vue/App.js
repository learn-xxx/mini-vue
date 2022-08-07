import { h, reactive, onLearn } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";
window.self = null;

// 开始学习模式，打印流程信息
onLearn();

export const App = {
  name: "App",
  render() {
    window.self = this;
    return h(
      "div",
      {
        onClick: this.handleClick
      },
      [
        h("div", {}, "hi," + this.msg),
        h(Foo, {
          count: this.state.count,
        }),
      ]
      // "hi! " + this.msg
    );
  },
  setup() {
    const state = reactive({
      count: 1
    });
    const handleClick = () => {
      state.count++;
    }
    return {
      msg: "mini-vue",
      state,
      handleClick
    };
  },
};
