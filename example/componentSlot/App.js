import { h } from '../../lib/mini-vue.esm.js';
import { Foo } from './Foo.js';

export const App = {
  name: 'App',
  render() {
    const app = h('div', {}, 'App');

    // single
    // const foo = h(Foo,{},h('p',{},'single'))

    // array
    // const foo = h(Foo, {}, [h('p', {}, '123'), h('p', {}, '456')]);

    // object
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => h('p', {}, 'header' + age),
        footer: () => h('p', {}, 'footer'),
      }
    );
    return h('div', {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
