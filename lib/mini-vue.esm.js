function isObject(target) {
    return typeof target === "object" && target !== null;
}
const extend = Object.assign;
const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal);
};
//call使this指向target，查找target中是否有某个属性
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
//转化为事件名（on开头）
const toHandleKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};
//把首字母转化为大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
//烤串式命名转化为驼峰式命名
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};

let activeEffect; //当前的依赖
let shouldTrack; //是否收集依赖
//响应式依赖 — 类
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.active = true; //表示当前依赖是否激活，如果清除过则为false
        this.deps = []; //包含该依赖的deps
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
        }
        finally {
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
    effect.deps.forEach((dep) => {
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
function track(target, key) {
    //如果不是track的状态，直接返回
    if (!isTracking())
        return;
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
    if (depSet.has(activeEffect))
        return;
    trackEffects(depSet);
}
function trackEffects(dep) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    //是否开启收集依赖 & 是否有依赖
    return shouldTrack && activeEffect !== undefined;
}
//一次性触发对应target中key的所有依赖
function trigger(target, key) {
    let depMap = targetMap.get(target);
    let dep = depMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
//创建一个依赖
function effect(fn, option = {}) {
    //为当前的依赖创建响应式实例
    const _effect = new ReactiveEffect(fn, option.scheduler);
    extend(_effect, option);
    //最开始调用一次
    _effect.run();
    const runner = _effect.run.bind(_effect);
    //在runner上挂载依赖，方便在其他地方访问到
    runner.effect = _effect;
    return runner;
    //bind:创建一个新函数，使函数的this指向传入的第一个参数，其他参数作为新函数的参数
}

//第一次生成，缓存下来，不需要每次都生成一个新的
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadOnly;
        }
        else if (key === "__v_isReadOnly" /* IS_READONLY */) {
            return isReadOnly;
        }
        const res = Reflect.get(target, key);
        //是否shallow
        if (shallow) {
            return res;
        }
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
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set: (key, target) => {
        console.warn(`key:${key} set 失败，因为target是一个readonly对象`, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn(`target:${raw}不是一个对象`);
        return raw;
    }
    //直接返回一个Proxy对象，实现响应式
    return new Proxy(raw, baseHandlers);
}

const PublicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        //查找值返回
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = PublicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function emit(instance, event, ...args) {
    //解构出props，被触发的函数其实已经以属性的形式挂载到当前组件实例上了
    //我们只需要匹配对应的函数名称，触发函数即可
    const { props } = instance;
    const eventName = toHandleKey(camelize(event));
    const handler = props[eventName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance);
    }
}
function normalizeObjectSlots(children, instance) {
    const slots = {};
    for (const key in children) {
        const value = children[key];
        //slot
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
    instance.slots = slots;
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

class RefImpl {
    constructor(value) {
        this._v_isRef = true;
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
function ref(value) {
    return new RefImpl(value);
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function isRef(ref) {
    return !!ref._v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(ObjectWithRefs) {
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
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

function createComponentInstance(vnode, parent) {
    const componentInstance = {
        vnode,
        type: vnode.type,
        render: Function,
        setupState: {},
        proxy: Proxy,
        props: {},
        provides: parent ? parent.provides : {},
        slots: {},
        parent,
        isMounted: false,
        subTree: {},
        emit: () => { },
    };
    //bind() 方法创建一个新的函数，在 bind() 被调用时，这个新函数的 this 被指定为 bind() 的第一个参数，
    //而其余参数将作为新函数的参数，供调用时使用。
    //此处我们将componentInstance作为函数的第一个参数，用户使用时传入的参数则为后续参数
    componentInstance.emit = emit.bind(null, componentInstance);
    return componentInstance;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    //处理setup返回值，初始化一个有状态的component
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    //创建代理
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        // 此处赋值全局变量，实现获取组件实例
        setCurrentInstance(instance);
        //setup()返回可能是function或object
        //如果是function，我们认为是组件的render函数
        //如果是object，则将返回的内容注入到上下文中
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        // 处理setup返回的结果
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    //function
    //TODO function
    if (typeof setupResult === "object") {
        // 提前解构，后续可以直接获取值
        instance.setupState = proxyRefs(setupResult);
    }
    //完成组件的初始化
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        //接收一个根组件对象，返回一个对象，包含mount方法
        return {
            mount(rootContainer) {
                //先把component转化成vnode（虚拟结点）
                //后续所有的逻辑操作，都会基于vnode做处理
                const vnode = createVNode(rootComponent);
                //转成虚拟结点之后，对其进行渲染
                render(vnode, rootContainer, null);
            },
        };
    };
}

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert, } = options;
    // 挂载孩子结点
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function mountElement(vnode, container, parentComponent) {
        // 将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { props, children, shapeFlag } = vnode;
        // 判断是否包含子结点，如果包含，也进行patch操作
        // 此处其实可以发现是一个递归的过程
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        // 对该结点的属性进行设置
        Object.keys(props).forEach((key) => {
            const value = props[key];
            hostPatchProps(el, key, null, value);
        });
        // 添加到容器中
        hostInsert(el, container);
    }
    // 处理element
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            // 挂载element
            mountElement(n2, container, parentComponent);
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container) {
        console.log('n1:', n1);
        console.log('n2:', n2);
        const oldProps = n1.props;
        const newProps = n2.props;
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            // 遍历新值，对比旧值
            for (const key in newProps) {
                const val = oldProps[key];
                const newVal = newProps[key];
                // 值不相等，进行修改
                if (val !== newVal) {
                    hostPatchProps(el, key, val, newVal);
                }
            }
            // 遍历老值，删除不在新值上的属性
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProps(el, key, oldProps[key], null);
                }
            }
        }
    }
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (!instance.isMounted) {
                console.log('init');
                // 我们取出实例中的proxy，将render函数中的this指向proxy
                // 那么在后续使用this.xxx获取值中，会调用proxy的getter方法
                // 因为我们在初始化组件时，已经对proxy的getter进行了定义
                // 从而实现使用this.xxx来方便地获取我们需要的值
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 递归调用
                // eslint-disable-next-line no-use-before-define
                patch(null, subTree, container, instance);
                // 在subTree渲染完成后，绑定$el根节点 
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const subTree = instance.render.call(instance.proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    function mountComponent(initialVNode, container, parentComponent) {
        // 创建一个组件实例
        const instance = createComponentInstance(initialVNode, parentComponent);
        // 初始化组件
        setupComponent(instance);
        // 对组件进行初次渲染
        setupRenderEffect(instance, initialVNode, container);
    }
    // 处理Component
    function processComponent(n1, n2, container, parentComponent) {
        // 挂载组件
        mountComponent(n2, container, parentComponent);
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processText(n1, n2, container) {
        const el = (n2.el = document.createTextNode(n2.children));
        container.append(el);
    }
    // 处理虚拟结点vnode，n1代表旧的结点，n2代表新的结点
    function patch(n1, n2, container, parentComponent) {
        // 判断类型
        // Fragment -> 只渲染子结点
        switch (n2.type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (n2.shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (n2.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function render(vnode, container, parentComponent) {
        // patch
        patch(null, vnode, container, parentComponent);
    }
    return {
        // 利用闭包，导出定义好的接口
        createApp: createAppAPI(render)
    };
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        shapeFlag: getShapeFlag(type),
        children,
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    //组件 + children object
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

function provide(key, value) {
    // 存在哪里
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        // 我们要实现的点是，如果当前这个组件使用了provide，
        // 那么我们要对provides进行重新赋值，将provides的原型指向父级组件的provides
        // 再对将key和value赋值到provides上
        const parentProvides = currentInstance.parent && currentInstance.parent.provides;
        // init，只有在初始化的时候才创建
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProps(el, key, preVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            // 如果新值为undefined或null，则删除该属性
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, container) {
    container.append(el);
}
const renderer = createRenderer({ createElement, patchProps, insert });
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextNode, getCurrentInstance, h, inject, provide, ref, renderSlots };
