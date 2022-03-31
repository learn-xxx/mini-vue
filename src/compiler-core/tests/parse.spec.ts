import { NodeTypes } from '../src/ast';
import { baseParse } from '../src/parse'
describe('Parse', () => {
  describe('interpolation', () => {
    test('simply interpolation', () => {
      const ast = baseParse('{{message}}');

      // root 
      expect(ast.children[0]).toStrictEqual({
        type: 'interpolation',
        content: {
          type: 'simply_expression',
          content: 'message'
        }
      })
    })
  })

  describe("element", () => {
    it("simply element div", () => {
      const ast = baseParse('<div></div>');
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div' 
      })
    })
  })

  describe("text", () => {
    it("simply element div", () => {
      const ast = baseParse('some text');
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some text' 
      })
    })
  })
})
