import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  //接收一个根组件对象，返回一个对象，包含mount方法
  return {
    mount(rootContainer) {
      //先把component转化成vnode（虚拟结点）
      //后续所有的逻辑操作，都会基于vnode做处理
      const vnode = createVNode(rootComponent);
      //转成虚拟结点之后，对其进行渲染
      render(vnode, rootContainer);
    },
  };
}
