//响应式依赖 — 类
class ReactiveEffect {
  private _fn: any;

  constructor(fn) {
    this._fn = fn;
  }
  run() {
    try {
      activeEffect = this;
      this._fn();
    } finally {
    }
  }
}

let activeEffect: ReactiveEffect; //当前的依赖
export function effect(fn) {
  //为当前的依赖创建响应式实例
  const _effect = new ReactiveEffect(fn);
  //最开始调用一次
  _effect.run();
}

// targetMap:{
//   [target:Map]:{
//     [key: Set]:[]
//   }
// }
const targetMap = new WeakMap();
//把依赖添加到targetMap对应target的key中，在重新set时在trigger中重新触发
export function track(target: Object, key) {
  if (!activeEffect) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
}
//一次性触发对应target中key的所有依赖
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let deps = depsMap.get(key);

  for (const effect of deps) {
    effect.run();
  }
}
