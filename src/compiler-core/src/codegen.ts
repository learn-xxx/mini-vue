import { isString } from "../../shared";
import { NodeTypes } from "./ast";
import { CREATE_ELEMENT_VNODE, helperMapName, TO_DISPLAY_STRING } from "./runtimeHelpers";

export function generate(ast) {
  const context = createCodegenContext()
  const { push } = context

  genFunctionPreamble(ast, context);

  const functionName = "render"
  const args = ["_ctx", "_cache"]
  push(`return `)

  const signature = args.join(', ');


  push(`function ${functionName}(${signature}){`);
  push(`return `)
  genNode(ast.codegenNode, context);
  push('}')

  return {
    code: context.code
  }
}
function genFunctionPreamble(ast: any, context: any) {
  const { push } = context
  const VueBinging = 'Vue';
  const aliasHelpers = (i) => `${helperMapName[i]}: _${helperMapName[i]}`;
  if (ast.helpers.length > 0) {
    push(`const { ${ast.helpers.map(aliasHelpers).join(", ")} } = ${VueBinging}`);
    push('\n');
  }
}

function genNode(node: any, ctx: any) {
  if (!node) return;
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, ctx);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, ctx);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, ctx);
      break;
    case NodeTypes.ELEMENT:
      genElement(node, ctx);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, ctx);
      break;
    default:
      break;
  }
}

function genCompoundExpression(node, ctx) {
  const { children } = node;
  const { push } = ctx
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isString(child)) {
      push(child)
    } else {
      genNode(child, ctx)
    }

  }
}

function genElement(node, ctx) {
  const { push, helper } = ctx;
  const { tag, children, props } = node
  const child = children[0];
  push(`${helper(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullable([tag, props, children]), ctx)
  // genNode(children,ctx)
  push(')')
}

function genNodeList(nodes, ctx) {
  const { push } = ctx
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) {
      push(node)
    } else {
      genNode(node, ctx)
    }
    if (i < nodes.length - 1) push(', ')
  }
}

function genNullable(args) {
  return args.map((arg) => arg || 'null')
}

function genText(node: any, ctx: any) {
  const { push } = ctx;
  push(`'${node.content}'`);
}

function createCodegenContext() {
  const context = {
    code: '',
    push(source) {
      context.code += source;
    },
    helper(key) {
      return `_${helperMapName[key]}`
    }
  }
  return context;
}


function genInterpolation(node: any, ctx: any) {
  const { push, helper } = ctx;
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, ctx)
  push(')')
}

function genExpression(node: any, ctx: any) {
  const { push } = ctx
  push(`${node.content}`)
}
