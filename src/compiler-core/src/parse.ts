import { NodeTypes } from "./ast";

const enum TagType {
  Start = 'tag_start',
  End = 'tag_end'
}

export function baseParse(context: string) {
  const content = createParseContext(context)
  return createRoot(parseChildren(content, []))
}

function parseChildren(context, ancestors) {
  const nodes:any = [];
  let node: any;
  while (true) {
    if (isEnd(context, ancestors)) break;
    const s = context.source;
    if (s.startsWith("{{")) {
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context)
    }

    nodes.push(node)
  }

  return nodes;
}

function isEnd(context, ancestors) {
  const s = context.source;
  if (s.startsWith('</')) {
    for (let i = ancestors.length - 1; i >= 0 ; i--) {
      const tag = ancestors[i].tag;
      if (startWithEndTagOpen(s, tag)) {
        return true;
      }
    }
  }
  return !context.source
}

function parseText(context) {
  let endIndex = context.source.length
  let endTokens = ["{{", '<']
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }
  const index = context.source.indexOf(endTokens);
  if (index !== -1) {
    endIndex = index;
  }
  const content = parseTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content,
  }
}

function parseTextData(context: any, length: number) {
  const content = context.source.slice(0, length);
  advanceBy(context, length);
  return content;
}

function parseElement(context, ancestors) {
  const element: any = parseTag(context, TagType.Start);

  ancestors.push(element)
  element.children = parseChildren(context, ancestors);
  ancestors.pop()

  if (startWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺少结束标签:${element.tag}`)
  }

  return element;
}

function startWithEndTagOpen(source, tag) {
  return source.startsWith('</') && source.slice(2, 2 + tag.length).toLowerCase() === tag
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
  const rawContent = parseTextData(context, rawContentLength)
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
    type:NodeTypes.ROOT
  }
}

function createParseContext(content: string) {
  return {
    source: content
  }
}
