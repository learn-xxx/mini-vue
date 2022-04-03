import { generate } from "../src/codegen";
import { baseParse } from "../src/parse"
import { transform } from "../src/transform";
import { transformExpression } from "../src/transform/transformExpression";
import { transformElement } from "../src/transform/transformElement";
import { transformText } from "../src/transform/transformText";

describe('codepen', () => {
  it('string', () => {
    const ast = baseParse('hi');

    transform(ast)

    const { code } = generate(ast);

    // 快照
    expect(code).toMatchSnapshot();
  })

  it('interpolation', () => {
    const ast = baseParse('{{message}}');

    transform(ast, {
      nodeTransforms: [transformExpression]
    })

    const { code } = generate(ast);

    // 快照
    expect(code).toMatchSnapshot();
  })

  it('element', () => {
    const ast: any = baseParse('<div>hi,{{message}}</div>');

    // 涉及一个中间层的调用顺序的问题
    transform(ast, {
      nodeTransforms: [transformExpression, transformElement, transformText]
    })
    const { code } = generate(ast);

    // 快照
    expect(code).toMatchSnapshot();
  })
})
