'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function isObject(target) {
    return typeof target === "object" && target !== null;
}
var extend = Object.assign;
//call使this指向target，查找target中是否有某个属性
var hasOwn = function (target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
};
//转化为事件名（on开头）
var toHandleKey = function (str) {
    return str ? "on" + capitalize(str) : "";
};
//把首字母转化为大写
var capitalize = function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
//烤串式命名转化为驼峰式命名
var camelize = function (str) {
    return str.replace(/-(\w)/g, function (_, c) {
        return c ? c.toUpperCase() : "";
    });
};

var targetMap = new Map();
//一次性触发对应target中key的所有依赖
function trigger(target, key) {
    var depMap = targetMap.get(target);
    var dep = depMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (var _i = 0, dep_1 = dep; _i < dep_1.length; _i++) {
        var effect_1 = dep_1[_i];
        if (effect_1.scheduler) {
            effect_1.scheduler();
        }
        else {
            effect_1.run();
        }
    }
}

//第一次生成，缓存下来，不需要每次都生成一个新的
var get = createGetter();
var set = createSetter();
var readonlyGet = createGetter(true);
var shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadOnly, shallow) {
    if (isReadOnly === void 0) { isReadOnly = false; }
    if (shallow === void 0) { shallow = false; }
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadOnly;
        }
        else if (key === "__v_isReadOnly" /* IS_READONLY */) {
            return isReadOnly;
        }
        var res = Reflect.get(target, key);
        //是否shallow
        if (shallow) {
            return res;
        }
        // 看看res是否是一个object
        if (isObject(res)) {
            return isReadOnly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        var res = Reflect.set(target, key, value);
        //触发依赖
        trigger(target, key);
        return res;
    };
}
var mutableHandlers = {
    get: get,
    set: set,
};
var readonlyHandlers = {
    get: readonlyGet,
    set: function (key, target) {
        console.warn("key:".concat(key, " set \u5931\u8D25\uFF0C\u56E0\u4E3Atarget\u662F\u4E00\u4E2Areadonly\u5BF9\u8C61"), target);
        return true;
    },
};
var shallowReadonlyHandlers = extend({}, readonlyHandlers, {
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
        console.warn("target:".concat(raw, "\u4E0D\u662F\u4E00\u4E2A\u5BF9\u8C61"));
        return raw;
    }
    //直接返回一个Proxy对象，实现响应式
    return new Proxy(raw, baseHandlers);
}

var PublicPropertiesMap = {
    $el: function (i) { return i.vnode.el; },
    $slots: function (i) { return i.slots; },
};
var PublicInstanceProxyHandlers = {
    get: function (_a, key) {
        var instance = _a._;
        var setupState = instance.setupState, props = instance.props;
        //查找值返回
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        var publicGetter = PublicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function emit(instance, event) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    //解构出props，被触发的函数其实已经以属性的形式挂载到当前组件实例上了
    //我们只需要匹配对应的函数名称，触发函数即可
    var props = instance.props;
    var eventName = toHandleKey(camelize(event));
    var handler = props[eventName];
    handler && handler.apply(void 0, args);
}

function initSlots(instance, children) {
    var vnode = instance.vnode;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance);
    }
}
function normalizeObjectSlots(children, instance) {
    var slots = {};
    var _loop_1 = function (key) {
        var value = children[key];
        //slot
        slots[key] = function (props) { return normalizeSlotValue(value(props)); };
    };
    for (var key in children) {
        _loop_1(key);
    }
    instance.slots = slots;
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    var componentInstance = {
        vnode: vnode,
        type: vnode.type,
        render: Function,
        setupState: {},
        proxy: Proxy,
        props: {},
        provides: parent ? parent.provides : {},
        slots: {},
        parent: parent,
        emit: function () { },
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
    var Component = instance.type;
    //创建代理
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    var setup = Component.setup;
    if (setup) {
        // 此处赋值全局变量，实现获取组件实例
        setCurrentInstance(instance);
        //setup()返回可能是function或object
        //如果是function，我们认为是组件的render函数
        //如果是object，则将返回的内容注入到上下文中
        var setupResult = setup(shallowReadonly(instance.props), {
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
        instance.setupState = setupResult;
    }
    //完成组件的初始化
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    var Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
var currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

var Fragment = Symbol('Fragment');
var Text = Symbol('Text');
// 挂载孩子结点
function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach(function (v) {
        // eslint-disable-next-line no-use-before-define
        patch(v, container, parentComponent);
    });
}
function mountElement(vnode, container, parentComponent) {
    // 将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
    var el = (vnode.el = document.createElement(vnode.type));
    vnode.props; var children = vnode.children, shapeFlag = vnode.shapeFlag;
    // 判断是否包含子结点，如果包含，也进行patch操作
    // 此处其实可以发现是一个递归的过程
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(vnode, el, parentComponent);
    }
    // 添加到容器中
    container.append(el);
}
// 处理element
function processElement(vnode, container, parentComponent) {
    // 挂载element
    mountElement(vnode, container, parentComponent);
}
function setupRenderEffect(instance, initialVNode, container) {
    // 我们取出实例中的proxy，将render函数中的this指向proxy
    // 那么在后续使用this.xxx获取值中，会调用proxy的getter方法
    // 因为我们在初始化组件时，已经对proxy的getter进行了定义
    // 从而实现使用this.xxx来方便地获取我们需要的值
    var proxy = instance.proxy;
    var subTree = instance.render.call(proxy);
    // 递归调用
    // eslint-disable-next-line no-use-before-define
    patch(subTree, container, instance);
    // 在subTree渲染完成后，绑定$el根节点
    initialVNode.el = subTree.el;
}
function mountComponent(initialVNode, container, parentComponent) {
    // 创建一个组件实例
    var instance = createComponentInstance(initialVNode, parentComponent);
    // 初始化组件
    setupComponent(instance);
    // 对组件进行初次渲染
    setupRenderEffect(instance, initialVNode, container);
}
// 处理Component
function processComponent(vnode, container, parentComponent) {
    // 挂载组件
    mountComponent(vnode, container, parentComponent);
}
function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent);
}
function processText(vnode, container) {
    var el = (vnode.el = document.createTextNode(vnode.children));
    container.append(el);
}
// 处理虚拟结点vnode
function patch(vnode, container, parentComponent) {
    // 判断类型
    // Fragment -> 只渲染子结点
    switch (vnode.type) {
        case Fragment:
            processFragment(vnode, container, parentComponent);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            if (vnode.shapeFlag & 1 /* ELEMENT */) {
                processElement(vnode, container, parentComponent);
            }
            else if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                processComponent(vnode, container, parentComponent);
            }
            break;
    }
}
function render(vnode, container, parentComponent) {
    // patch
    patch(vnode, container, parentComponent);
}

function createVNode(type, props, children) {
    var vnode = {
        type: type,
        props: props,
        shapeFlag: getShapeFlag(type),
        children: children,
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

function createApp(rootComponent) {
    //接收一个根组件对象，返回一个对象，包含mount方法
    return {
        mount: function (rootContainer) {
            //先把component转化成vnode（虚拟结点）
            //后续所有的逻辑操作，都会基于vnode做处理
            var vnode = createVNode(rootComponent);
            //转成虚拟结点之后，对其进行渲染
            render(vnode, rootContainer, null);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    var slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

function provide(key, value) {
    // 存在哪里
    var currentInstance = getCurrentInstance();
    if (currentInstance) {
        var provides = currentInstance.provides;
        // 我们要实现的点是，如果当前这个组件使用了provide，
        // 那么我们要对provides进行重新赋值，将provides的原型指向父级组件的provides
        // 再对将key和value赋值到provides上
        var parentProvides = currentInstance.parent && currentInstance.parent.provides;
        // init，只有在初始化的时候才创建
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    var currentInstance = getCurrentInstance();
    if (currentInstance) {
        var parentProvides = currentInstance.parent.provides;
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

exports.createApp = createApp;
exports.createTextNode = createTextNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.renderSlots = renderSlots;
