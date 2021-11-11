export function createVNode(type, props?, children?) {
  const vnode = {
    type, // rootComponent
    props,
    children,
  };
  return vnode;
}
