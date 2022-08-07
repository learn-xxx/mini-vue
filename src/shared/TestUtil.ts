import { Fragment, Text } from "../runtime-core/renderer";

export function printSentence(...note: any[]) {
  if (!checkStatus()) {
    return;
  }
  console.log('▶️ ', ...note)
}

export function printStage(...stage: any[]) {
  if (!checkStatus()) {
    return;
  }
  console.log("--------- ", ...stage, " ---------")
}

export function printTip(...tip: string[]) {
  if (!checkStatus()) {
    return;
  }
  console.warn('提示:', ...tip)
}

function checkStatus() {
  //@ts-ignore
  return window.IS_LEARNING;
}

export function onLearn() {
  //@ts-ignore
  window.IS_LEARNING = true;
}


export function offLearn() {
  //@ts-ignore
  window.IS_LEARNING = false;
}

export function printTable(prefix: string | null, ...args: any[]) {
  if (!checkStatus()) {
    return;
  }
  prefix && printSentence(prefix);
  console.table(...args);
}

export const vnodeToTable = (vnode: { type: any; props: any; shapeFlag: number; children: any; componentInstance: any; el: any; key: any; }) => ({
  type: {
    value: vnode.type,
    describe: '结点类型：组件或者元素',
  },
  props: {
    describe: '结点属性对象',
    value: vnode.props
  },
  ShapeFlags: {
    describe: '结点特征，辅助后续的逻辑判断',
    value: vnode.shapeFlag.toString(2)
  },
  children: {
    describe: '子结点',
    value: vnode.children
  },
  componentInstance: {
    describe: '组件实例',
    value: vnode.componentInstance
  },
  el: {
    describe: '挂载位置',
    value: vnode.el
  },
  key: {
    describe: '结点唯一标识',
    value: vnode.key
  }
})

export const instanceToTable = (instance: {
  proxy: any; vnode: any; type: any; render: any; setupState: any; props: any; nextVNode: any; provides: any; slots: any; parent: any; isMounted: any; subTree: any;
}) => ({
  vnode: {
    value: instance.vnode,
    describe: '实例对应的组件',
  },
  type: {
    value: instance.type,
    describe: '实例/组件类型：组件或者元素',
  },
  render: {
    value: instance.render,
    describe: '组件渲染函数',
  },
  setupState: {
    value: instance.setupState,
    describe: 'setup后生成的实例状态',
  },
  proxy: {
    describe: '数据代理对象',
    value: instance.proxy
  },
  props: {
    describe: '实例传入的值',
    value: instance.props
  },
  nextVNode: {
    describe: '数据更新后新的vnode',
    value: instance.nextVNode
  },
  provides: {
    describe: '用于跨组件传值的对象，基于原型链原理实现',
    value: instance.provides
  },
  slots: {
    describe: '组件的插槽数组',
    value: instance.slots
  },
  parent: {
    describe: '父组件实例',
    value: instance.parent
  },
  isMounted: {
    describe: '实例是否已经挂载',
    value: instance.isMounted
  },
  subTree: {
    describe: '子节点的实例树',
    value: instance.subTree
  },
})

export const genVNodeFeature = (vnode: { type: string | number; shapeFlag: number; }) => {
  const map = genTypeMap()
  const shape = genShapFlagMap();
  let str: any[] = [];
  str.push('该结点的类型为:', map[vnode.type] || vnode.type, ',特征为:');
  for (const [key, value] of shape.entries()) {
    if (vnode.shapeFlag & key) {
      str.push(value);
    }
  }
  return str;
}

function genTypeMap() {
  return {
    [Fragment]: '片段',
    [Text]: '文本结点'
  };
}

function genShapFlagMap() {
  const shape = new Map();
  shape.set(1, 'HTML元素');
  shape.set(1 << 1, '有状态的组件');
  shape.set(1 << 2, '孩子结点为文本');
  shape.set(1 << 3, '孩子结点为数组');
  shape.set(1 << 4, '孩子结点为插槽');
  return shape;
}

export function once(fn: Function) {
  let tmp: Function | null = fn;
  return (...args: any[]) => {
    if (tmp) {
      tmp(...args);
      tmp = null
    }
  }
}

export const genSpace = (num: number) => {
  return ' '.repeat(num);
}

// @ts-ignore
export const getUpNum = () => window.up;

export const defineUpNum = () => {
  let i = 0;
  Object.defineProperty(window, 'up', {
    get() {
      return ++i;
    },
    set(v) {
      i = 0;
    }
  })
}

export const resetUpNum = () => {
  // @ts-ignore
  window.up = 0;
}
