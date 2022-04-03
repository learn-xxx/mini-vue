import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers"

export const enum NodeTypes {
  INTERPOLATION = 'interpolation',
  SIMPLE_EXPRESSION = 'simply_expression',
  ELEMENT = 'element',
  TEXT = 'text',
  ROOT = 'root',
  COMPOUND_EXPRESSION = 'compound_expression'
}

export function createVNodeCall(ctx,tag, props, children) {
  ctx.helper(CREATE_ELEMENT_VNODE)
  
  return {
    type: NodeTypes.ELEMENT,
    tag, props, children
  }
}
