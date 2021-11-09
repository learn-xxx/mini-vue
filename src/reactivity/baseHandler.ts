import { isObject, ReactiveFlags } from "../shared";
import { track, trigger } from "./effect";
import { reactive, readonly } from "./reactive";

//第一次生成，缓存下来，不需要每次都生成一个新的
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

function createGetter(isReadOnly: Boolean = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadOnly;
    }

    const res = Reflect.get(target, key);

    // 看看res是否是一个object
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res);
    }

    if (!isReadOnly) {
      //收集依赖
      track(target, key);
    }
    return res;
  };
}

function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    //触发依赖
    trigger(target, key);
    return res;
  };
}

export const mutableHandlers = {
  get,
  set,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set: (key, target) => {
    console.warn(`key:${key} set 失败，因为target是一个readonly对象`, target);
    return true;
  },
};
