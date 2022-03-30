import { createRenderer } from '../runtime-core'

function createElement(type) {
  return document.createElement(type)
}

function patchProps(el, key, preVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);

  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      // 如果新值为undefined或null，则删除该属性
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

function insert(child, parent, anchor) {
  parent.insertBefore(child, anchor || null);
}

function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child)
  }
}

function setElementText(el, text) {
  el.textContent = text;
}

const renderer: any = createRenderer({ createElement, patchProps, insert, remove, setElementText })

export function createApp(...args) {
  return renderer.createApp(...args);
}

// 先运行runtime-dom（基于dom的实现）, 再导出runtime-core（更通用的接口）
export * from "../runtime-core";
