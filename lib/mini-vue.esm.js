function isObject(target) {
    return typeof target === "object" && target !== null;
}

var PublicPropertiesMap = {
    $el: function (i) { return i.vnode.el; },
};
var PublicInstanceProxyHandlers = {
    get: function (_a, key) {
        var instance = _a._;
        var setupState = instance.setupState;
        //setupState
        if (key in setupState) {
            return setupState[key];
        }
        var publicGetter = PublicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function createComponentInstance(vnode) {
    var componentInstance = {
        vnode: vnode,
        type: vnode.type,
        render: Function,
        setupState: {},
        proxy: Proxy,
    };
    return componentInstance;
}
function setupComponent(instance) {
    //TODO
    // InitProps()
    //initSlots()
    //处理setup返回值，初始化一个有状态的component
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    var Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    var setup = Component.setup;
    if (setup) {
        //setup()返回可能是function或object
        //如果是function，我们认为是组件的render函数
        //如果是object，则将返回的内容注入到上下文中
        var setupResult = setup();
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

function render(vnode, container) {
    //patch
    patch(vnode, container);
}
function patch(vnode, container) {
    //处理组件
    //判断是否是element
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    //挂载元素
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    //绑定 $el
    var el = (vnode.el = document.createElement(vnode.type));
    var props = vnode.props, children = vnode.children;
    if (typeof vnode.children === "string") {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(vnode, el);
    }
    for (var key in props) {
        var value = props[key];
        console.log(key, value);
        el.setAttribute(key, value);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(function (v) {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    //挂载组件
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    //创建一个组件实例
    var instance = createComponentInstance(initialVNode);
    // 初始化组件
    setupComponent(instance);
    //
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    var subTree = instance.render.call(instance.proxy);
    //vnode -> patch
    //vnode -> element -> mountElement
    //递归调用
    patch(subTree, container);
    //绑定 $el根节点
    initialVNode.el = subTree.el;
}

function createVNode(type, props, children) {
    var vnode = {
        type: type,
        props: props,
        children: children,
    };
    return vnode;
}

function createApp(rootComponent) {
    //接收一个根组件对象
    return {
        mount: function (rootContainer) {
            //先转化成vnode
            // component -> vnode
            //后续所有的逻辑操作，都会基于vnode做处理
            var vnode = createVNode(rootComponent);
            //转成虚拟节点之后，对其进行渲染
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };