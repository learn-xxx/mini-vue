import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {

  const context = createTransformContext(root, options);

  // 1. 遍历 - 深度优先搜索
  traverseNode(root, context)
  // 2. 修改 text content

  createRootCodegen(root)
  root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root) {
  const child = root.children[0];
  if(child.type === NodeTypes.ELEMENT){
    root.codegenNode = child.codegenNode
  }else{
    root.codegenNode = root.children[0];
  }
}


function traverseNode(node, context) {
  const { nodeTransforms } = context
  let exitFns:any = [];
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    // 调用中间层之后，可能会返回一个函数，那么储存起来
    // 在逻辑处理完成后再进行调用
    // 例如：实现后的调用逻辑为[1,2,3,3',2',1']
    const onExit =  transform(node, context);
    if(onExit) exitFns.push(onExit);
  }
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChild(node, context);
      break;
    default:
      break;
  }
  // 流程结束之后，会取出所有中间件返回的函数，倒序执行
  let i = exitFns.length
  while(i--){
    exitFns[i]()
  }
}

function traverseChild(node: any, context: any) {
  const children = node.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      traverseNode(node, context);
    }
  }
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      this.helpers.set(key, 1);
    }
  }
  return context;
}
