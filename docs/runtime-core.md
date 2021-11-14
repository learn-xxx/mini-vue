# 【手写vue3系列】一个Vue应用的构建过程

## （一）阅读必看

**技术栈：**Typescript + Jest

文章中代码非完整代码，为方便理解作适当精简，详细代码可见仓库。

github：https://github.com/Merlin218/my-mini-vue

gitee：https://gitee.com/merlin218/my-mini-vue

学习参考：崔大 mini-vue  https://github.com/cuixiaorui/mini-vue



回顾上期，我们完成了vue响应式的相关实现，这一期我们来完成vue在运行时的核心部分，一步步构建一个vue应用。

> 上期链接
>
> 【手写vue3系列】响应式实现：https://juejin.cn/post/7028613132339642382

## （二）原料/工具准备

### （1）原料

> Index.html：Vue应用的容器，我们一般将Vue应用挂载在“#app”的结点上。

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>

<body>
  <div id="app"></div>
  <script src="./main.js" type="module"></script>
</body>

</html>
```

> main.js：入口文件，以module的形式嵌入index.html中

```javascript
import { App } from "./App.js";
import { createApp } from "../../lib/mini-vue.esm.js";
const app = document.querySelector("#app");
createApp(App).mount(app);
```

> App.js：根结点组件,创建一个Vue应用

```javascript
import { h } from "../../lib/mini-vue.esm.js";

export const App = {
  render() {
    return h("div", {}, "hi! " + this.msg);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
```

### （2）工具

在编写vue3时，我们使用typescript作为编码语言，它提供了良好的类型检查和代码提示等优点，使用rollup作为打包工具。

```bash
npm i typescript rollup @rollup/plugin-typescript tslib -D
```

### （3）配置

```json
//package.json
{
  //...
  "main": "/lib/mini-vue.cjs.js",
  "module": "/lib/mini-vue.esm.js",
  "scripts": {
    "build": "rollup -c rollup.config.js --watch"
  },
  //...
}
```

```js
//rollup.config.js
import typescript from "@rollup/plugin-typescript";
export default {
  input: "./src/index.ts", //入口
  output: [ //出口
    {
      format: "cjs",  //CommonJs规范
      file: "lib/mini-vue.cjs.js",
    },
    {
      format: "es",   //ES Module规范
      file: "lib/mini-vue.esm.js",
    },
  ],
  plugins: [typescript()],  //插件
};
```

```json
//tsconfig.json
{
  "compilerOptions":{
    "module":"esnext"
  }
}
```

## （三）原理剖析

### （1）流程图

![runtime-core](https://i.loli.net/2021/11/14/FopV9cedr6RzM7a.png)

### （2）流程讲解

首先，我们可以看到main.js中，导入了一个createApp的函数，我们可以从这里入手。

```typescript
//createApp.ts
import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  //接收一个根组件对象，返回一个对象，包含mount方法
  return {
    mount(rootContainer) {
      //先把component转化成vnode（虚拟结点）
      //后续所有的逻辑操作，都会基于vnode做处理
      const vnode = createVNode(rootComponent);
      //转成虚拟结点之后，对其进行渲染
      render(vnode, rootContainer);
    },
  };
}
```

顺着逻辑，我们创建一个对根组件创建根节点vnode

对于vnode，可能存在两种情况：

- 一种是一个组件 `component`
  - 如根组件
- 一种是一个具体的元素标签 `element`
  - 如 App.js 的 render函数 中 h函数 接受的`div`

```typescript
//vnode.js
export function createVNode(type, props?, children?) {
  const vnode = {
    type, // component或element
    props, 
    children,
  };
  return vnode;
}
```

> h函数实际上也还是让回一个vnode，只不过这个vnode的类型是element

```typescript
//h.ts
import { createVNode } from "./vnode";

export function h(type, props?: Object, children?: String | Array<Object>) {
  return createVNode(type, props, children);
}
```

创建完结点，我们对其进行渲染。

```typescript
//renderer.ts
export function render(vnode, container) {
  patch(vnode, container);
}

//处理虚拟结点vnode
function patch(vnode, container) {
  //判断类型
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    processComponent(vnode, container);
  }
}
```

对于element类型结点，相对比较简单。

```typescript
//renderer.ts
//处理element
function processElement(vnode: any, container) {
  //挂载element
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  //将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
  const el = (vnode.el = document.createElement(vnode.type));

  const { props, children } = vnode;
  //判断是否包含子结点，如果包含，也进行patch操作
  //此处其实可以发现是一个递归的过程
  if (typeof vnode.children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(vnode, el);
  }

  //对该结点的属性进行设置
  for (const key in props) {
    const value = props[key];
    el.setAttribute(key, value);
  }
  //添加到容器中
  container.append(el);
}

//挂载孩子结点
function mountChildren(vnode: any, container: any) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}
```

对于component的结点：

```typescript
//renderer.ts
//处理component
function processComponent(vnode: any, container: any) {
  //挂载组件
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container) {
  //创建一个组件实例
  const instance = createComponentInstance(initialVNode);

  //初始化组件实例
  setupComponent(instance);

  //对组件实例进行初次渲染
  setupRenderEffect(instance, initialVNode, container);
}
```

创建一个组件实🌰：

```typescript
//component.ts
export function createComponentInstance(vnode) {
  const componentInstance = {
    vnode, //虚拟结点
    type: vnode.type, //组件类型
    render: Function, //render函数
    setupState: {}, // 组件状态
    proxy: Proxy, // 组件代理对象
  };
  return componentInstance;
}
```

初始化组件实🌰：

```typescript
//component.ts
export function setupComponent(instance) {
  //TODO
  //initProps()
  //initSlots()

  //处理setup返回值，初始化一个有状态的component
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  const Component = instance.type;
  
  //我们定义一个代理对象，为后续通过this.xxx访问数据提供基础
  instance.proxy = new Proxy(
    {_:instance},
    PublicInstanceProxyHandlers
  );

  const { setup } = Component;

  if (setup) {
    //setup()返回可能是function或object
    //如果是function，我们认为是组件的render函数
    //如果是object，则将返回的内容注入到上下文中
    const setupResult = setup();

    // 处理setup返回的结果
    handleSetupResult(instance, setupResult);
  }
}
```

```typescript
//componentPublicInstance.ts
const PublicPropertiesMap = {
  $el: (i) => i.vnode.el,
  //...
};

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState } = instance;
    //setupState
    if (key in setupState) {
      return setupState[key];
    }
    const publicGetter = PublicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
```

处理setup返回的结果：

```typescript
//component.ts
function handleSetupResult(instance, setupResult: any) {
  //function
  //TODO function

  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  finishComponentSetup(instance);
}
//完成组件的初始化
function finishComponentSetup(instance: any) {
  const Component = instance.type;

  if (Component.render) {
    instance.render = Component.render;
  }
}

```

完成初始化后，对组件进行初次渲染：

```typescript
//renderer.ts
function setupRenderEffect(instance: any, initialVNode, container) {
  //我们取出实例中的proxy，将render函数中的this指向proxy
  //那么在后续使用this.xxx获取值中，会调用proxy的getter方法
  //因为我们在初始化组件时，已经对proxy的getter进行了定义
  //从而实现使用this.xxx来方便地获取我们需要的值
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);

  //递归调用
  patch(subTree, container);

  //在subTree渲染完成后，绑定$el根节点
  initialVNode.el = subTree.el;
}
```

到此，我们实现了一个基本的组件初始化渲染的过程，接下来我们可以新建一个index.ts作为打包入口文件，将用户需要的创建函数导出。

```typescript
export { createApp } from "./createApp";
export { h } from "./h";
```

运行 `yarn build` 进行打包，我们得到了 `mini-vue.esm.js` 文件。

将文件引入`main.js`和`App.js`，浏览器运行`index.html`文件。

相信就可以看到我们的 `hi! mini-vue` 了！

![image-20211114093653399](https://i.loli.net/2021/11/14/9Xa4YWRMJODKxt6.png)

