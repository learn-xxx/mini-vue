import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  //patch
  patch(vnode, container);
}

function patch(vnode, container) {
  //处理组件

  //判断是否是element
  //processElement()
  processComponent(vnode, container);
}

function processComponent(vnode: any, container: any) {
  //挂载组件
  mountComponent(vnode,container);
}

function mountComponent(vnode: any,container) {
  //创建一个组件实例
  const instance = createComponentInstance(vnode);

  // 初始化组件
  setupComponent(instance);

  //
  setupRenderEffect(instance,container);
}

function setupRenderEffect(instance: {
  vnode: any;
  type: any;
  render: FunctionConstructor;
},container) {
  const subTree = instance.render();

  //vnode -> patch
  //vnode -> element -> mountElement
  //递归调用
  patch(subTree,container)
}
