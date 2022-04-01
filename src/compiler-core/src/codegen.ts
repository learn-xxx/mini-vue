import { NodeTypes } from "./ast";
import { helperMapName, TO_DISPLAY_STRING } from "./runtimeHelpers";

export function generate(ast) {
  const context = createCodegenContext()
  const { push } = context

  genFunctionPreamble(ast, context);
  push("return ")

  const functionName = "render"
  const args = ["_ctx", "_cache"]

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
  const VueBinging = "Vue";
  const aliasHelpers = (i) => `${helperMapName[i]}: _${helperMapName[i]}`;
  if (ast.helpers.length > 0) {
    push(`import { ${ast.helpers.map(aliasHelpers).join(", ")} } from ${VueBinging}`);
    push('\n');
  }
}

function genNode(node: any, ctx: any) {
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
    default:
      break;
  }

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
    helper(key){
      return `_${helperMapName[key]}`
    }
  }
  return context;
}


function genInterpolation(node: any, ctx: any) {
  const { push,helper } = ctx;
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, ctx)
  push(')')
}

function genExpression(node: any, ctx: any) {
  const { push } = ctx
  push(`${node.content}`)
}
