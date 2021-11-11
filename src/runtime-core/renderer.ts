import { isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  //patch
  patch(vnode, container);
}

function patch(vnode, container) {
  //处理组件

  //判断是否是element
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container) {
  //挂载元素
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  const el = document.createElement(vnode.type);

  const { props, children } = vnode;

  if (typeof vnode.children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(vnode, el);
  }

  console.log(props);
  for (const key in props) {
    const value = props[key];
    console.log(key, value);
    el.setAttribute(key, value);
  }

  container.append(el);
}

function mountChildren(vnode: any, container: any) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode: any, container: any) {
  //挂载组件
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container) {
  //创建一个组件实例
  const instance = createComponentInstance(vnode);

  // 初始化组件
  setupComponent(instance);

  //
  setupRenderEffect(instance, container);
}

function setupRenderEffect(
  instance: {
    vnode: any;
    type: any;
    render: FunctionConstructor;
  },
  container
) {
  const subTree = instance.render();

  //vnode -> patch
  //vnode -> element -> mountElement
  //递归调用
  patch(subTree, container);
}
