# 【手写vue3系列】响应式实现

## （一）文章基础

**技术栈：**Typescript + Jest

文章中代码非完整代码，为方便理解作适当精简，详细代码可见仓库。

github：https://github.com/Merlin218/my-mini-vue

gitee：https://gitee.com/merlin218/my-mini-vue

学习参考：崔大 mini-vue  https://github.com/cuixiaorui/mini-vue

## 	（二）响应式原理

利用ES6中Proxy作为拦截器，在get时收集依赖，在set时触发依赖，来实现响应式。

## （三）手写实现

###    1、实现Reactive

基于原理，我们可以先写一下测试用例

```typescript
//reactive.spec.ts
describe("effect", () => {
  it("happy path", () => {
    const original = { foo: 1 }; //原始数据
    const observed = reactive(original); //响应式数据
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1); //正常获取数据
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isProxy(observed)).toBe(true);
  });
});

```

首先实现数据的拦截处理，通过ES6的Proxy，实现获取和赋值操作。

```typescript
//reactive.ts
//对new Proxy()进行包装
export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

function createActiveObject(raw: any, baseHandlers) {
  //直接返回一个Proxy对象，实现响应式
  return new Proxy(raw, baseHandlers);
}
```

```typescript
//baseHandler.ts
//抽离出一个handler对象
export const mutableHandlers = {
  get:createGetter(),
  set:createSetter(),
};

function createGetter(isReadOnly: Boolean = false, shallow: Boolean = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key);
    // 看看res是否是一个object
    if (isObject(res)) {
      //如果是，则进行嵌套处理,使得返回的对象中的 对象 也具备响应式
      return isReadOnly ? readonly(res) : reactive(res);
    }
    if (!isReadOnly) {
      //如果不是readonly类型，则收集依赖
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
```

从上述代码中，我们可以⚠️注意到**track(target, key)**和**trigger(target, key)**这两个函数，分别是对依赖的收集和触发。

> 依赖：我们可以把依赖认为是把用户对数据的操控（用户函数，副作用函数）包装成一个东西，我们在get的时候将依赖一个一个收集起来，set的时候全部触发，即可实现响应式效果。

### 2、实现依赖的收集和触发

```typescript
//effect.ts
//全局变量
let activeEffect: ReactiveEffect; //当前的依赖
let shouldTrack: Boolean; //是否收集依赖
const targetMap = new WeakMap(); //依赖树
```

> 结构：
>
> targetMap:{
>
> ​	每一个target（depsMap）：{
>
> ​		每一个key（depSet）：[
>
> ​			每一个依赖
>
> ​		]
>
> ​	}
>
> }

> *WeakMap和Map的区别*
>
> *1、WeakMap只接受对象作为key，如果设置其他类型的数据作为key，会报错。*
>
> *2、WeakMap的key所引用的对象都是弱引用，只要对象的其他引用被删除，垃圾回收机制就会释放该对象占用的内存，从而避免内存泄漏。*
>
> *3、由于WeakMap的成员随时可能被垃圾回收机制回收，成员的数量不稳定，所以没有size属性。*
>
> *4、没有clear()方法*
>
> *5、不能遍历*

首先我们定义一个依赖类，称为ReactiveEffect，对用户函数进行包装，赋予一些属性和方法。

```typescript
//effect.ts
//响应式依赖 — ReactiveEffect类
class ReactiveEffect {
  private _fn: any;  //用户函数，
  active = true; //表示当前依赖是否激活，如果清除过则为false
  deps: any[] = []; //包含该依赖的deps
  onStop?: () => void;  //停止该依赖的回调函数
  public scheduler: Function;  //调度函数
  
  //构造函数
  constructor(fn, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  //执行副作用函数
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
}
```

#### effect影响函数

创建一个用户函数作用函数，称为effect，这个函数的功能为基于ReactiveEffect类创建一个依赖，触发用户函数（的时候，触发依赖收集），返回用户函数。

```typescript
//创建一个依赖
export function effect(fn, option: any = {}) {
  //为当前的依赖创建响应式实例
  const _effect = new ReactiveEffect(fn, option.scheduler);
  Object.assign(_effect, option);
  //最开始调用一次,其中会触发依赖收集  _effect.run() -> _fn() -> get() -> track()
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  //在runner上挂载依赖，方便在其他地方通过runner访问到该依赖
  runner.effect = _effect;
  return runner;
}
```

> bind()：在原函数的基础上创建一个新函数，使新函数的this指向传入的第一个参数，其他参数作为新函数的参数

用户触发依赖收集时，将依赖添加到targetMap中。

#### 		收集/添加依赖

```typescript
//把依赖添加到targetMap对应target的key中，在重新set时在trigger中重新触发
export function track(target: Object, key) {
  //如果不是track的状态，直接返回
  if (!isTracking()) return;

  // target -> key -> dep
  //获取对应target，获取不到则创建一个，并加进targetMap中
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  //获取对应key，获取不到则创建一个，并加进target中
  let depSet = depsMap.get(key);
  if (!depSet) {
    depsMap.set(key, (depSet = new Set()));
  }

  //如果depSet中已经存在该依赖，直接返回
  if (depSet.has(activeEffect)) return;

  //添加依赖
  trackEffects(depSet);
}

export function trackEffects(dep) {
  //往target中添加依赖
  dep.add(activeEffect);
  //添加到当前依赖的deps数组中
  activeEffect.deps.push(dep);
}
```

#### 		触发依赖

```typescript
//一次性触发对应target中key的所有依赖
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let depSet = depsMap.get(key);
	//触发依赖
  triggerEffects(depSet);
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
```

### 3、移除/停止依赖

我们在ReactiveEffect这个类中，增加一个stop方法，来暂停依赖收集和清除已经存在的依赖

```typescript
//响应式依赖 — 类
class ReactiveEffect {
  private _fn: any;  //用户函数，
  active = true; //表示当前依赖是否激活，如果清除过则为false
  deps: any[] = []; //包含该依赖的deps
  onStop?: () => void;  //停止该依赖的回调函数
  public scheduler: Function;  //调度函数
 
  //...
  
  stop() {
    if (this.active) {
      cleanupEffect(this);
      //执行回调
      if (this.onStop) {
        this.onStop();
      }
      //清除激活状态
      this.active = false;
    }
  }
}

//清除该依赖挂载的deps每一项中的该依赖
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

//移除一个依赖
export function stop(runner) {
  runner.effect.stop();
}
```

## （四）衍生类型

### 1、实现readonly

readonly相比于reactive，实现上相对比较简单，它是一个只读类型，不会涉及set操作，更不需要收集/触发依赖。

```typescript
export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

export const readonlyHandlers = {
  get: readonlyGet,
  set: (key, target) => {
    console.warn(`key:${key} set 失败，因为target是一个readonly对象`, target);
    return true;
  },
};

const readonlyGet = createGetter(true);

function createGetter(isReadOnly: Boolean = false, shallow: Boolean = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadOnly;
    }

    //...

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
```

### 2、实现shallowReadonly

我们先看一下shallow的含义

>  shallow：不深的, 浅的，不深的, 不严肃的, 肤浅的，浅薄的。

那么shallowReadonly，指的是只对最外层进行限制，而内部的仍然是一个普通的、正常的值。

```typescript
//shallowReadonly.ts
export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandlers);
}

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});

const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadOnly: Boolean = false, shallow: Boolean = false) {
  return function get(target, key) {
    //..
    const res = Reflect.get(target, key);
    
    //是否shallow,是的话很直接返回
    if (shallow) {
      return res;
    }
    
    if (isObject(res)) {
      //...
    }
  };
}
```

### 3、实现ref

ref相对reactive而言，实际上他不存在嵌套关系，就是一个value。

```typescript
//ref.ts
export function ref(value: any) {
  return new RefImpl(value);
}
```

我们来实现一下RefImpl类，原理其实跟reactive类似，只是一些细节处不同。

```typescript
//ref.ts
class RefImpl {
  private _value: any; //转化后的值
  public dep; //依赖容器
  private _rawValue: any; //原始值，
  public _v_isRef = true; //判断ref类型
  constructor(value) {
    this._rawValue = value; //记录原始值
    this._value = convert(value); //存储转化后的值
    this.dep = new Set(); //创建依赖容器
  }
  get value() {
    trackRefValue(this); //收集依赖
    return this._value;
  }
  set value(newValue) {
    //新老值不同，才触发更改
    if (hasChanged(newValue, this._rawValue)) {
      // 一定先修改value，再触发依赖
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}
```

```typescript
//ref.ts
//对value进行转换（value可能是object）
export function convert(value: any) {
  return isObject(value) ? reactive(value) : value;
}

export function trackRefValue(ref: RefImpl) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

//effect.ts
export function isTracking(): Boolean {
  //是否开启收集依赖 & 是否有依赖
  return shouldTrack && activeEffect !== undefined;
}

export function trackEffects(dep) {
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
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
```

- 实现proxyRefs

  ```typescript
  //实现对ref对象进行代理
  //如user = {
  //  age:ref(10),
  //  ...
  //}
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
  ```

### 4、实现computed

computed的实现也很巧妙，利用调度器机制和一个私有变量_value，实现**缓存**和**惰性求值**。

通过注解（一）（二）（三）可理解其实现流程

```typescript
//computed
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

```

## （五）工具类

```typescript
//是否是reactive响应式类型
export function isReactive(target) {
  return !!target[ReactiveFlags.IS_REACTIVE];
}
//是否是readonly响应式类型
export function isReadOnly(target) {
  return !!target[ReactiveFlags.IS_READONLY];
}
//是否是响应式对象
export function isProxy(target) {
  return isReactive(target) || isReadOnly(target);
}
//是否是对象
export function isObject(target) {
  return typeof target === "object" && target !== null;
}
//是否是ref
export function isRef(ref: any) {
  return !!ref._v_isRef;
}
//解构ref
export function unRef(ref: any) {
  return isRef(ref) ? ref.value : ref;
}
//是否改变
export const hasChanged = (val, newVal) => {
  return !Object.is(val, newVal);
};
```

判断响应式类型的依据是，在get的时候，**检查传进来的key是否等于某枚举值**来做为判断依据，在get中加入

```typescript
//reactive.ts
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadOnly",
}

//baseHandler.ts
function createGetter(isReadOnly: Boolean = false, shallow: Boolean = false) {
  return function get(target, key) {
    //...
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadOnly;
    }
    //...
  };
}
```

