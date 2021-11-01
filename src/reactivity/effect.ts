//响应式依赖 — 类
class ReactiveEffect {
  private _fn: any;

  constructor(fn) {
    this._fn = fn;
  }
  run() {
    try {
      activeEffect = this;
      return this._fn();
    } finally {
      //todo
    }
  }
}

let activeEffect: ReactiveEffect; //当前的依赖
export function effect(fn) {
  //为当前的依赖创建响应式实例
  const _effect = new ReactiveEffect(fn);
  //最开始调用一次
  _effect.run();

  return _effect.run.bind(_effect);

  //bind:创建一个新函数，使函数的this指向传入的第一个参数，其他参数作为新函数的参数
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
