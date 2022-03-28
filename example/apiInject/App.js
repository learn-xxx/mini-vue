import { h, provide, inject } from '../../lib/mini-vue.esm.js';

const Provider = {
  name: 'Provider',
  setup() {
    provide('foo', 'fooVal')
    provide('bar', 'barVal')
  },
  render() {
    return h('div', {}, [h('p', {}, 'provider'), h(ProviderTwo)]);
  }
}

const ProviderTwo = {
  name: 'ProviderTwo',
  setup() {
    provide('foo', 'fooVal2')
    const foo = inject('foo');
    return {foo}
  },
  render() {
    return h('div', {}, [h('p', {}, 'ProviderTwo:'+this.foo), h(Consumer)]);
  }
}

const Consumer = {
  name: 'Consumer',
  setup() {
    const foo = inject('foo')
    const bar = inject('bar')
    const fooTwo = inject('fooTwo',()=>'fooTwo')
    return { foo, bar,fooTwo }
  },
  render() {
    return h('div', {}, [h('p', {}, 'foo: ' + this.foo), h('p', {}, 'bar: ' + this.bar),h('p', {}, 'fooTwo: ' + this.fooTwo)]);
  }
}

export const App = {
  name: 'App',
  setup() { },
  render() {
    return h('div', {}, [h('p', {}, "apiInject"), h(Provider)]);
  }

}
