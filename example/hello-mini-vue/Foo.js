import { h } from "../../lib/mini-vue.esm.js";
export const Foo = {
  name: 'Foo',
  setup(props) {
    console.log(props.count);
    props.count++;
  },
  render() {
    return h("div", {}, "foo:" + this.count);
  },
};
