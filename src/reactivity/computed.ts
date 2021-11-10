import { ReactiveEffect } from "./effect";

class computedRefImpl {
  private _dirty: boolean = true;
  private _effect: ReactiveEffect;
  private _value: any;

  constructor(getter) {
    //创建时，会创建一个响应式实例，并且挂载
    this._effect = new ReactiveEffect(getter, () => {
      //（三）
      //当监听的值发生改变时，会触发set，此时触发当前依赖
      //因为存在调度器，不会立刻执行用户fn（实现了lazy），而是将_dirty更改为true
      //在下一次用户get时，会调用run方法，重新拿到最新的值返回
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }

  get value() {
    //（一）
    //默认_dirty是true
    //那么在第一次get的时候，会触发响应式实例的run方法，触发依赖收集
    //同时拿到用户fn的值，存储起来，然后返回出去
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    //（二）
    //当监听的值没有改变时，_dirty一直为false
    //所以，第二次get时，因为_dirty为false，那么直接返回存储起来的_value
    return this._value;
  }
}

export function computed(getter) {
  //创建一个computed实例
  return new computedRefImpl(getter);
}
