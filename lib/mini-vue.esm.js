function toDisplayString(value) {
    return String(value);
}

function isObject(target) {
    return typeof target === "object" && target !== null;
}
const isString = (value) => typeof value === 'string';
const extend = Object.assign;
const EMPTY_OBJ = {};
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
    $props: (i) => i.props
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

let compiler;
function createComponentInstance(vnode, parent) {
    const componentInstance = {
        vnode,
        type: vnode.type,
        render: Function,
        setupState: {},
        proxy: Proxy,
        props: {},
        nextVNode: null,
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
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
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
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponent(n1, n2) {
    const { props: prevProps } = n1;
    const { props: nextProps } = n2;
    for (const key in prevProps) {
        if (prevProps[key] !== nextProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
const p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while (job = queue.shift()) {
        job && job();
    }
}

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    // 挂载孩子结点
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        // 将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { props, children, shapeFlag } = vnode;
        // 判断是否包含子结点，如果包含，也进行patch操作
        // 此处其实可以发现是一个递归的过程
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        if (props) {
            // 对该结点的属性进行设置
            Object.keys(props).forEach((key) => {
                const value = props[key];
                hostPatchProps(el, key, null, value);
            });
        }
        // 添加到容器中
        hostInsert(el, container, anchor);
    }
    // 处理element
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 挂载element
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('n1:', n1);
        console.log('n2:', n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const { shapeFlag, children: c2 } = n2;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                // 删除老的children 
                unmountedChildren(n1.children);
            }
            if (c1 !== c2) {
                // 设置文本
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                hostSetElementText(container, '');
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                patchKeyChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0;
        const l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        function isSameVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 找左侧开始不同的地方
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                // 两结点相同，继续patch子节点 
                patch(n1, n2, container, parentComponent, anchor);
            }
            else {
                break;
            }
            i++;
        }
        // 找右侧开始不同的地方
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, anchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 新的比老的多 创建
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        // 老的比新的多 删除
        else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        // 中间对比
        else {
            let s1 = i;
            let s2 = i;
            const toBePatch = e2 - s2 + 1; // 应该更新的结点数
            let patched = 0; // 已经更新的结点数
            // 建立索引表，存储新节点的key与索引的关系
            const keyToNewIndexMap = new Map();
            // 建立数组，存储中间部分的 新节点和旧结点的索引关系
            const newIndexToOldIndexMap = new Array(toBePatch);
            // 初始化数组
            for (let i = 0; i < toBePatch; i++)
                newIndexToOldIndexMap[i] = -1;
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 存储新结点的映射关系
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 如果结点都已经更新完，那么剩下的结点都可以直接移除
                if (patched >= toBePatch) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                // 寻找新结点中是否存在该节点
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // 如果索引不存在，则去除该节点
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                // 如果存在，更新这个结点
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    // 在这里我们可以认为新结点就是存在的
                    // newIndex表示新节点的索引，s2表示中间部门的开头，数组长度为应该更新的结点数量
                    // 所以需要相减，获得在数组中的真实位置
                    // i代表旧结点的索引
                    newIndexToOldIndexMap[newIndex - s2] = i;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    // 更新结点数+1
                    patched++;
                }
            }
            // 获取最长递增子序列的索引数组 如：[4,2,3] -> [1,2]
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatch - 1; i >= 0; i--) {
                const target = i + s2;
                const targetChild = c2[target];
                const anchor = target + 1 < l2 ? c2[target + 1].el : null;
                if (newIndexToOldIndexMap[i] === -1) {
                    // -1表示当前结点在旧结点中不存在，所以需要创建
                    patch(null, targetChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 不相等说明需要交换位置
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        hostInsert(targetChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountedChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
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
            if (oldProps !== EMPTY_OBJ) {
                // 遍历老值，删除不在新值上的属性
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProps(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log('init');
                // 我们取出实例中的proxy，将render函数中的this指向proxy
                // 那么在后续使用this.xxx获取值中，会调用proxy的getter方法
                // 因为我们在初始化组件时，已经对proxy的getter进行了定义
                // 从而实现使用this.xxx来方便地获取我们需要的值
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                // 递归调用
                // eslint-disable-next-line no-use-before-define
                patch(null, subTree, container, instance, anchor);
                // 在subTree渲染完成后，绑定$el根节点 
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log('update');
                const { nextVNode, vnode } = instance; // vnode是旧虚拟结点，next是新虚拟结点
                // 如果有nextVNode，说明组件需要更新
                if (nextVNode) {
                    nextVNode.el = vnode.el;
                    updateComponentPreRender(instance, nextVNode);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log('update -- scheduler');
                queueJobs(instance.update);
            }
        });
    }
    function updateComponentPreRender(instance, nextVNode) {
        // 更新实例上的值
        instance.vnode = nextVNode;
        instance.nextVNode = null;
        instance.props = nextVNode.props;
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 创建一个组件实例
        // 在vnode上保留实例，在更新的时候可以重新获取到render函数
        const instance = (initialVNode.componentInstance = createComponentInstance(initialVNode, parentComponent));
        // 初始化组件
        setupComponent(instance);
        // 对组件进行初次渲染
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    // 处理Component
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 挂载组件
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        const instance = (n2.componentInstance = n1.componentInstance);
        if (shouldUpdateComponent(n1, n2)) {
            // 通过vnode拿到实例对象
            // 把instance上的next标记为n2，方便在后续取到新的props等
            instance.nextVNode = n2;
            // 调用实例上的update方法（render方法）
            instance.update();
        }
        else {
            n2.el = n1.el;
            n2.vnode = n2;
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        const el = (n2.el = document.createTextNode(n2.children));
        container.append(el);
    }
    // 处理虚拟结点vnode，n1代表旧的结点，n2代表新的结点
    function patch(n1, n2, container, parentComponent, anchor) {
        // 判断类型
        // Fragment -> 只渲染子结点
        switch (n2.type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (n2.shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (n2.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function render(vnode, container, parentComponent) {
        // patch
        patch(null, vnode, container, parentComponent, null);
    }
    return {
        // 利用闭包，导出定义好的接口
        createApp: createAppAPI(render)
    };
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        shapeFlag: getShapeFlag(type),
        children,
        componentInstance: null,
        el: null,
        key: props && props.key
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
function insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({ createElement, patchProps, insert, remove, setElementText });
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextNode: createTextNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    push(`return `);
    const signature = args.join(', ');
    push(`function ${functionName}(${signature}){`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    };
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = 'Vue';
    const aliasHelpers = (i) => `${helperMapName[i]}: _${helperMapName[i]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelpers).join(", ")} } = ${VueBinging}`);
        push('\n');
    }
}
function genNode(node, ctx) {
    if (!node)
        return;
    switch (node.type) {
        case "text" /* TEXT */:
            genText(node, ctx);
            break;
        case "interpolation" /* INTERPOLATION */:
            genInterpolation(node, ctx);
            break;
        case "simply_expression" /* SIMPLE_EXPRESSION */:
            genExpression(node, ctx);
            break;
        case "element" /* ELEMENT */:
            genElement(node, ctx);
            break;
        case "compound_expression" /* COMPOUND_EXPRESSION */:
            genCompoundExpression(node, ctx);
            break;
    }
}
function genCompoundExpression(node, ctx) {
    const { children } = node;
    const { push } = ctx;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, ctx);
        }
    }
}
function genElement(node, ctx) {
    const { push, helper } = ctx;
    const { tag, children, props } = node;
    children[0];
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), ctx);
    // genNode(children,ctx)
    push(')');
}
function genNodeList(nodes, ctx) {
    const { push } = ctx;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, ctx);
        }
        if (i < nodes.length - 1)
            push(', ');
    }
}
function genNullable(args) {
    return args.map((arg) => arg || 'null');
}
function genText(node, ctx) {
    const { push } = ctx;
    push(`'${node.content}'`);
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genInterpolation(node, ctx) {
    const { push, helper } = ctx;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, ctx);
    push(')');
}
function genExpression(node, ctx) {
    const { push } = ctx;
    push(`${node.content}`);
}

function baseParse(context) {
    const content = createParseContext(context);
    return createRoot(parseChildren(content, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    let node;
    while (true) {
        if (isEnd(context, ancestors))
            break;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith('</')) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !context.source;
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["{{", '<'];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && index < endIndex) {
            endIndex = index;
        }
    }
    const index = context.source.indexOf(endTokens);
    if (index !== -1) {
        endIndex = index;
    }
    const content = parseTextData(context, endIndex);
    return {
        type: "text" /* TEXT */,
        content,
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
function parseElement(context, ancestors) {
    const element = parseTag(context, "tag_start" /* Start */);
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, "tag_end" /* End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function startWithEndTagOpen(source, tag) {
    return source.startsWith('</') && source.slice(2, 2 + tag.length).toLowerCase() === tag;
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)>/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    if (type === "tag_end" /* End */)
        return;
    return {
        type: "element" /* ELEMENT */,
        tag
    };
}
function parseInterpolation(context) {
    const openDelimiter = '{{';
    const closeDelimiter = '}}';
    // 拿到结尾的索引
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // 前进，去除{{
    advanceBy(context, openDelimiter.length);
    // 目标内容的长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 获取的内容
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    // 前进，去除}}
    advanceBy(context, closeDelimiter.length);
    return {
        type: "interpolation" /* INTERPOLATION */,
        content: {
            type: "simply_expression" /* SIMPLE_EXPRESSION */,
            content,
        }
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: "root" /* ROOT */
    };
}
function createParseContext(content) {
    return {
        source: content
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1. 遍历 - 深度优先搜索
    traverseNode(root, context);
    // 2. 修改 text content
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === "element" /* ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function traverseNode(node, context) {
    const { nodeTransforms } = context;
    let exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        // 调用中间层之后，可能会返回一个函数，那么储存起来
        // 在逻辑处理完成后再进行调用
        // 例如：实现后的调用逻辑为[1,2,3,3',2',1']
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case "interpolation" /* INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case "root" /* ROOT */:
        case "element" /* ELEMENT */:
            traverseChild(node, context);
            break;
    }
    // 流程结束之后，会取出所有中间件返回的函数，倒序执行
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChild(node, context) {
    const children = node.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context);
        }
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            this.helpers.set(key, 1);
        }
    };
    return context;
}

function createVNodeCall(ctx, tag, props, children) {
    ctx.helper(CREATE_ELEMENT_VNODE);
    return {
        type: "element" /* ELEMENT */,
        tag, props, children
    };
}

function transformElement(node, context) {
    if (node.type === "element" /* ELEMENT */) {
        return () => {
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === "interpolation" /* INTERPOLATION */) {
        node.content.content;
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

const isText = (node) => node.type === "text" /* TEXT */ || node.type === "interpolation" /* INTERPOLATION */;

function transformText(node) {
    if (node.type === "element" /* ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = (children[i] = {
                                    type: "compound_expression" /* COMPOUND_EXPRESSION */,
                                    children: [child]
                                });
                            }
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseComplie(template) {
    const ast = baseParse(template);
    // 涉及一个中间层的调用顺序的问题
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseComplie(template);
    console.log(code);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createVNode as createElementVNode, createRenderer, createTextNode, getCurrentInstance, h, inject, nextTick, provide, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
