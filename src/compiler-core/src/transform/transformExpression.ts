import {NodeTypes} from '../ast'


export function transformExpression(node){
  if(node.type === NodeTypes.INTERPOLATION){
    const rawContent = node.content.content;
    node.content= processExpression(node.content)
  }
}

function processExpression(node){
  node.content = `_ctx.${node.content}`
  return node;
}

