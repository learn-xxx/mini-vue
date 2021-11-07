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
      activeEffect = this;
      return this._fn();
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
}

const targetMap = new WeakMap();
// targetMap:{
//   [target:Map]:{
//     [key: Set]:[]
//   }
// }

//WeakMap和Map的区别
// 1、WeakMap只接受对象作为key，如果设置其他类型的数据作为key，会报错。
// 2、WeakMap的key所引用的对象都是弱引用，只要对象的其他引用被删除，垃圾回收机制就会释放该对象占用的内存，从而避免内存泄漏。
// 3、由于WeakMap的成员随时可能被垃圾回收机制回收，成员的数量不稳定，所以没有size属性。
// 4、没有clear()方法
// 5、不能遍历

//把依赖添加到targetMap对应target的key中，在重新set时在trigger中重新触发
export function track(target: Object, key) {
  if (!activeEffect) {
    return;
  }
  // target -> key -> dep
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}
//一次性触发对应target中key的所有依赖
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let deps = depsMap.get(key);

  for (const effect of deps) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

let activeEffect: ReactiveEffect; //当前的依赖

//创建一个依赖
export function effect(fn, option: any = {}) {
  //为当前的依赖创建响应式实例
  const _effect = new ReactiveEffect(fn, option.scheduler);
  Object.assign(_effect, option);
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
