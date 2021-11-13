import { PublicInstanceProxyHandlers } from "./componentPublicInstance";

export function createComponentInstance(vnode) {
  const componentInstance = {
    vnode,
    type: vnode.type,
    render: Function,
    setupState: {},
    proxy: Proxy,
  };
  return componentInstance;
}

export function setupComponent(instance) {
  //TODO
  // InitProps()
  //initSlots()

  //处理setup返回值，初始化一个有状态的component
  setupStatefulComponent(instance);
}
function setupStatefulComponent(instance: any) {
  const Component = instance.type;

  instance.proxy = new Proxy(
    {_:instance},
    PublicInstanceProxyHandlers
  );

  const { setup } = Component;

  if (setup) {
    //setup()返回可能是function或object
    //如果是function，我们认为是组件的render函数
    //如果是object，则将返回的内容注入到上下文中
    const setupResult = setup();

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
