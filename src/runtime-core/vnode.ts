import { once, printTable } from '../shared/TestUtil';
import { ShapeFlags } from '../shared/ShapeFlags';
import { Text } from './renderer'

export {
  createVNode as createElementVNode
}

const printVNodeStructure = once(printTable)

export function createVNode(type, props?, children?) {
  const shapeFlag = getShapeFlag(type)
  const vnode = {
    type, // component或element
    props,
    shapeFlag,
    children,
    componentInstance: null,
    el: null,
    key: props && props.key
  };
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }
  //组件 + children object
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN;
    }
  }
  return vnode;
}

export function createTextNode(text: string) {
  return createVNode(Text, {}, text);
}

function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
