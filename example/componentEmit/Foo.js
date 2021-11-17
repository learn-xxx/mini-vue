import { h } from "../../lib/mini-vue.esm.js";
export const Foo = {
  setup(props, { emit }) {
    const emitAdd = () => {
      //触发add
      emit("add", 1, 2);

      //触发addFoo
      emit("add-foo");
    };

    return {
      emitAdd,
    };
  },
  render() {
    const btn = h(
      "button",
      {
        onClick: this.emitAdd,
      },
      "emitAddButton"
    );
    const foo = h("div", {}, "foo");
    return h("div", {}, [foo, btn]);
  },
};
