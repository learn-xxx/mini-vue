import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  //接收一个根组件对象
  return {
    mount(rootContainer) {
      //先转化成vnode
      // component -> vnode
      //后续所有的逻辑操作，都会基于vnode做处理

      const vnode = createVNode(rootComponent);

      //转成虚拟节点之后，对其进行渲染
      render(vnode, rootContainer);
    },
  };
}
