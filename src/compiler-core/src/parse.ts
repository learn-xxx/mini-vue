import { NodeTypes } from "./ast";

const enum TagType {
  Start = 'tag_start',
  End = 'tag_end'
}

export function baseParse(context: string) {
  const content = createParseContext(context)
  return createRoot(parseChildren(content))
}

function parseChildren(context) {
  const nodes = [];
  let node: any;
  const s = context.source;
  if (s.startsWith("{{")) {
    node = parseInterpolation(context)
  } else if (s[0] === '<') {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context);
    }
  }

  if (!node) {
    node = parseText(context)
  }

  nodes.push(node)

  return nodes;
}

function parseText(context) {
  const content = parseTextData(context,context.source.length);
  return {
    type: NodeTypes.TEXT,
    content,
  }
}

function parseTextData(context: any,length:number) {
  const content = context.source.slice(0, length);
  advanceBy(context, length);
  return content;
}

function parseElement(context) {
  const element = parseTag(context, TagType.Start);
  parseTag(context, TagType.End)
  return element;
}

function parseTag(context, type) {
  const match: any = /^<\/?([a-z]*)>/i.exec(context.source);

  const tag = match[1];
  advanceBy(context, match[0].length);

  if (type === TagType.End) return;
  return {
    type: NodeTypes.ELEMENT,
    tag
  }
}

function parseInterpolation(context) {

  const openDelimiter = '{{';
  const closeDelimiter = '}}';

  // 拿到结尾的索引
  const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
  // 前进，去除{{
  advanceBy(context, openDelimiter.length);
  // 目标内容的长度
  const rawContentLength = closeIndex - openDelimiter.length
  // 获取的内容
  const rawContent = parseTextData(context,rawContentLength)
  const content = rawContent.trim()

  // 前进，去除}}
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    }
  }
}


function advanceBy(context, length) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return {
    children,
  }
}

function createParseContext(content: string) {
  return {
    source: content
  }
}
