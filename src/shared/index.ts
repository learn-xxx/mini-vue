export function isObject(target) {
  return typeof target === "object" && target !== null;
}

export function isReactive(target) {
  return !!(target && target.__isReactive);
}
