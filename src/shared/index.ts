export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadOnly"
}

export function isObject(target) {
  return typeof target === "object" && target !== null;
}

export function isReactive(target) {
  return !!target[ReactiveFlags.IS_REACTIVE];
}

export function isReadOnly(target) {
  return !!target[ReactiveFlags.IS_READONLY]
  
}
