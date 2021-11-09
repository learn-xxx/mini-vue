import { mutableHandlers, readonlyHandlers } from "./baseHandler";

function createActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}

export function reactive(raw) {
  //直接返回一个Proxy对象，实现响应式
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

