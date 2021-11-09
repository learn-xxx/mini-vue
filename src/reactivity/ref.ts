import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  public dep;
  private _rawValue: any;
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
      // 一定先修改value
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}

export function convert(value: any) {
  return isObject(value) ? reactive(value) : value;
}

export function ref(value: any) {
  return new RefImpl(value);
}

export function trackRefValue(ref: RefImpl) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}
