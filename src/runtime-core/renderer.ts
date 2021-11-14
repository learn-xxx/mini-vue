import { isObject } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  //patch
  patch(vnode, container);
}

//处理虚拟结点vnode
function patch(vnode, container) {
  //判断类型
  if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

//处理element
function processElement(vnode: any, container) {
  //挂载element
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  //将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
  const el = (vnode.el = document.createElement(vnode.type));

  const { props, children, shapeFlag } = vnode;
  //判断是否包含子结点，如果包含，也进行patch操作
  //此处其实可以发现是一个递归的过程
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }

  //对该结点的属性进行设置
  for (const key in props) {
    const value = props[key];
    el.setAttribute(key, value);
  }
  //添加到容器中
  container.append(el);
}

//挂载孩子结点
function mountChildren(vnode: any, container: any) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode: any, container: any) {
  //挂载组件
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container) {
  //创建一个组件实例
  const instance = createComponentInstance(initialVNode);

  // 初始化组件
  setupComponent(instance);

  //对组件进行初次渲染
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container) {
  //我们取出实例中的proxy，将render函数中的this指向proxy
  //那么在后续使用this.xxx获取值中，会调用proxy的getter方法
  //因为我们在初始化组件时，已经对proxy的getter进行了定义
  //从而实现使用this.xxx来方便地获取我们需要的值
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);

  //递归调用
  patch(subTree, container);

  //在subTree渲染完成后，绑定$el根节点
  initialVNode.el = subTree.el;
}
