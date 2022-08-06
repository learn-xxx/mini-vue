import { defineUpNum, once, printSentence, printStage, printTable, printTip, vnodeToTable } from "../shared/TestUtil";
import { createVNode } from "./vnode";

const printVNodeStructure = once(printTable)


export function createAppAPI(render) {
  return function createApp(rootComponent) {
    //接收一个根组件对象，返回一个对象，包含mount方法
    return {
      mount(rootContainer) {
        printStage('程序开始');
        printStage('根据组件对象创建vnode');

        printSentence('当前组件：', rootComponent)
        //先把component转化成vnode（虚拟结点）
        //后续所有的逻辑操作，都会基于vnode做处理
        const vnode = createVNode(rootComponent);
        printVNodeStructure('vnode的基本结构：', vnodeToTable(vnode))
        //转成虚拟结点之后，对其进行渲染
        defineUpNum();
        render(vnode, rootContainer, null);
      },
    };
  }

}
