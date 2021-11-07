import { isObject, isReactive } from "../shared";
import { track, trigger } from "./effect";

export function reactive(raw) {
  if (!isObject(raw)) {
    return raw;
  }
  //直接返回一个Proxy对象，实现响应式
  const proxy = new Proxy(raw, {
    get: (target, key, receiver) => {
      const res = Reflect.get(target, key, receiver);
      //收集依赖
      track(target, key);
      return res;
    },
    set: (target, key, value, receiver) => {
      const res = Reflect.set(target, key, value, receiver);
      //触发依赖
      trigger(target, key);
      return res;
    },
  });
  return proxy;
}
