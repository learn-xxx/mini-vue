import { h, renderSlots } from '../../lib/mini-vue.esm.js';

export const Foo = {
  setup() {
    return {};
  },
  render() {
    const foo = h('p', {}, 'foo');
    return h('p', {}, [
      renderSlots(this.$slots, 'header', {
        age:18
      }),
      foo,
      renderSlots(this.$slots, 'footer'),
    ]);
  },
};
