export function createVNode(type, props?, children?) {
  const vnode = {
    type, // component或element
    props,
    children,
  };
  return vnode;
}
