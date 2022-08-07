import { hasChanged, isObject } from "../shared";
import { once, printSentence } from "../shared/TestUtil";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

const printSentence4 = once(printSentence);


class RefImpl {
  private _value: any;
  public dep;
  private _rawValue: any;
  public _v_isRef = true;
  constructor(value) {
    //判断value是不是Object
    this._rawValue = value;
    this._value = convert(value);
    this.dep = new Set();
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      printSentence4('【响应式数据发生了改变', '新值为', newValue, '旧值为', this._rawValue, '】')
      // 一定先修改value
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}

const printSentence1 = once(printSentence);

export function ref(value: any) {
  const ref = new RefImpl(value)
  printSentence1('创建一个ref响应式对象：', ref)
  return ref
}

export function convert(value: any) {
  return isObject(value) ? reactive(value) : value;
}

export function trackRefValue(ref: RefImpl) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function isRef(ref: any) {
  return ref && !!ref._v_isRef;
}

export function unRef(ref: any) {
  return isRef(ref) ? ref.value : ref;
}

export function proxyRefs(ObjectWithRefs) {
  return new Proxy(ObjectWithRefs, {
    get(target, key) {
      // 如果是ref 返回.value
      //如果不是 返回value
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        target[key].value = value;
        return true; //?
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
