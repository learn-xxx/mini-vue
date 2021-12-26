import { createVNode } from "./vnode";

export function h(type, props?: Object, children?: String | Array<Object>) {
  return createVNode(type, props, children);
}
