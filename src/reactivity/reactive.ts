import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandler";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadOnly",
}

export function isReactive(target) {
  return !!target[ReactiveFlags.IS_REACTIVE];
}

export function isReadOnly(target) {
  return !!target[ReactiveFlags.IS_READONLY];
}

export function isProxy(target) {
  return isReactive(target) || isReadOnly(target);
}

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandlers);
}

function createActiveObject(raw: any, baseHandlers) {
  //直接返回一个Proxy对象，实现响应式
  return new Proxy(raw, baseHandlers);
}
