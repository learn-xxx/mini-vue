import { h } from "../../lib/mini-vue.esm.js";
export const Foo = {
  name: 'Foo',
  setup(props) {
  },
  render() {
    return h("div", {}, "foo:" + this.count);
  },
};
