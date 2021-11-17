import { shallowReadonly } from "../reactivity/reactive";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initProps } from "./componentProps";
import { emit } from "./componentEmit";
export function createComponentInstance(vnode) {
  const componentInstance = {
    vnode,
    type: vnode.type,
    render: Function,
    setupState: {},
    proxy: Proxy,
    emit: () => {},
  };
  //bind() 方法创建一个新的函数，在 bind() 被调用时，这个新函数的 this 被指定为 bind() 的第一个参数，
  //而其余参数将作为新函数的参数，供调用时使用。

  //此处我们将componentInstance作为函数的第一个参数，用户使用时传入的参数则为后续参数
  componentInstance.emit = emit.bind(null, componentInstance) as any;
  return componentInstance;
}

export function setupComponent(instance) {
  //TODO
  initProps(instance, instance.vnode.props);
  //initSlots()

  //处理setup返回值，初始化一个有状态的component
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  const Component = instance.type;

  //创建代理
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  const { setup } = Component;

  if (setup) {
    //setup()返回可能是function或object
    //如果是function，我们认为是组件的render函数
    //如果是object，则将返回的内容注入到上下文中
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });

    // 处理setup返回的结果
    handleSetupResult(instance, setupResult);
  }
}
function handleSetupResult(instance, setupResult: any) {
  //function
  //TODO function

  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  //完成组件的初始化
  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;

  if (Component.render) {
    instance.render = Component.render;
  }
}
