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
        tag: 'div',
        children: []
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

  test('hello world', () => {
    const ast = baseParse('<div>hi,{{message}}</div>');
    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      children: [
        {
          type: NodeTypes.TEXT,
          content: 'hi,'
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'message'
          }
        }
      ]
    })
  })

  test('nest element', () => {
    const ast = baseParse('<div><p>hi,</p>{{message}}</div>');
    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: 'p',
          children: [
            {
              type: NodeTypes.TEXT,
              content: 'hi,'
            },
          ]
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'message'
          }
        }
      ]
    })
  })

  test('should throw error when lack end tag',()=>{
    expect(()=>{
      baseParse("<div><span></div>")
    }).toThrowError()
  })
})
