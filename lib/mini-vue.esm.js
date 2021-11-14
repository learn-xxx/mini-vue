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
//处理虚拟结点vnode
function patch(vnode, container) {
    //判断类型
    if (vnode.shapeFlag & 1 /* ELEMENT */) {
        processElement(vnode, container);
    }
    else if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
//处理element
function processElement(vnode, container) {
    //挂载element
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    //将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
    var el = (vnode.el = document.createElement(vnode.type));
    var props = vnode.props, children = vnode.children, shapeFlag = vnode.shapeFlag;
    //判断是否包含子结点，如果包含，也进行patch操作
    //此处其实可以发现是一个递归的过程
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    //对该结点的属性进行设置
    for (var key in props) {
        var value = props[key];
        var isOn = function (key) { return /^on[A-Z]/.test(key); };
        if (isOn(key)) {
            var event_1 = key.slice(2).toLowerCase();
            el.addEventListener(event_1, value);
        }
        else {
            el.setAttribute(key, value);
        }
    }
    //添加到容器中
    container.append(el);
}
//挂载孩子结点
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
    //对组件进行初次渲染
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    //我们取出实例中的proxy，将render函数中的this指向proxy
    //那么在后续使用this.xxx获取值中，会调用proxy的getter方法
    //因为我们在初始化组件时，已经对proxy的getter进行了定义
    //从而实现使用this.xxx来方便地获取我们需要的值
    var proxy = instance.proxy;
    var subTree = instance.render.call(proxy);
    //递归调用
    patch(subTree, container);
    //在subTree渲染完成后，绑定$el根节点
    initialVNode.el = subTree.el;
}

function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

function createVNode(type, props, children) {
    var vnode = {
        type: type,
        props: props,
        shapeFlag: getShapeFlag(type),
        children: children,
    };
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    return vnode;
}

function createApp(rootComponent) {
    //接收一个根组件对象，返回一个对象，包含mount方法
    return {
        mount: function (rootContainer) {
            //先把component转化成vnode（虚拟结点）
            //后续所有的逻辑操作，都会基于vnode做处理
            var vnode = createVNode(rootComponent);
            //转成虚拟结点之后，对其进行渲染
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
