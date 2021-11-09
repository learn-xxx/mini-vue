import { extend } from "../shared";

let activeEffect: ReactiveEffect; //当前的依赖
let shouldTrack: Boolean; //是否收集依赖

//响应式依赖 — 类
class ReactiveEffect {
  private _fn: any;
  active = true; //表示当前依赖是否激活，如果清除过则为false
  deps: any[] = []; //包含该依赖的deps
  onStop?: () => void;

  public scheduler: Function;
  constructor(fn, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    //用户函数，可以报错，需要用try包裹
    try {
      //如果当前依赖不是激活状态，不进行依赖收集，直接返回
      if (!this.active) {
        return this._fn();
      }
      //开启依赖收集
      shouldTrack = true;
      activeEffect = this;
      //调用时会触发依赖收集
      const result = this._fn();
      //关闭依赖收集
      shouldTrack = false;
      //返回结果
      return result;
    } finally {
      //todo
    }
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

//清除该依赖挂载的deps每一项中的自己
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

const targetMap = new Map();
// targetMap:{
//   [target:Map]:{
//     [key: Set]:[]
//   }
// }

//把依赖添加到targetMap对应target的key中，在重新set时在trigger中重新触发
export function track(target: Object, key) {
  //如果不是track的状态，直接返回
  if (!isTracking()) return;

  // target -> key -> dep
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let depSet = depsMap.get(key);
  if (!depSet) {
    depsMap.set(key, (depSet = new Set()));
  }

  //如果depSet中已经存在，直接返回
  if (depSet.has(activeEffect)) return;

  trackEffects(depSet);
}

export function trackEffects(dep) {
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function isTracking(): Boolean {
  //是否开启收集依赖 & 是否有依赖
  return shouldTrack && activeEffect !== undefined;
}

//一次性触发对应target中key的所有依赖
export function trigger(target, key) {
  let depMap = targetMap.get(target);
  let dep = depMap.get(key);

  triggerEffects(dep);
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

//创建一个依赖
export function effect(fn, option: any = {}) {
  //为当前的依赖创建响应式实例
  const _effect = new ReactiveEffect(fn, option.scheduler);
  extend(_effect, option);
  //最开始调用一次
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  //在runner上挂载依赖，方便在其他地方访问到
  runner.effect = _effect;
  return runner;

  //bind:创建一个新函数，使函数的this指向传入的第一个参数，其他参数作为新函数的参数
}

//移除一个依赖
export function stop(runner) {
  runner.effect.stop();
}
