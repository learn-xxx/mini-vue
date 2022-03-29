
import { effect } from '../reactivity/effect';
import { EMPTY_OBJ } from '../shared';
import { ShapeFlags } from '../shared/ShapeFlags';
import { createComponentInstance, setupComponent } from './component';
import { createAppAPI } from './createApp';

export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');

export function createRenderer(options) {

  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProps,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText
  } = options;

  // 挂载孩子结点
  function mountChildren(children: any, container: any, parentComponent) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function mountElement(vnode: any, container: any, parentComponent) {
    // 将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { props, children, shapeFlag } = vnode;
    // 判断是否包含子结点，如果包含，也进行patch操作
    // 此处其实可以发现是一个递归的过程
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent);
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
  function processElement(n1, n2: any, container, parentComponent) {
    if (!n1) {
      // 挂载element
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container,parentComponent);
    }
  }

  function patchElement(n1, n2, container,parentComponent) {
    console.log('n1:', n1)
    console.log('n2:', n2)

    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    const el = (n2.el = n1.el);

    patchChildren(n1, n2, el,parentComponent);
    patchProps(el, oldProps, newProps);
  }

  function patchChildren(n1, n2, container,parentComponent) {
    const prevShapeFlag = n1.shapeFlag;
    const c1 = n1.children
    const { shapeFlag, children } = n2;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 删除老的children 
        unmountedChildren(n1.children);
      }
      if (c1 !== children) {
        // 设置文本
        hostSetElementText(container, children)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
        mountChildren(children,container,parentComponent); 
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
        const val = oldProps[key]
        const newVal = newProps[key]
        // 值不相等，进行修改
        if (val !== newVal) {
          hostPatchProps(el, key, val, newVal)
        }
      }
      if (oldProps !== EMPTY_OBJ) {
        // 遍历老值，删除不在新值上的属性
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProps(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  function setupRenderEffect(instance: any, initialVNode, container) {
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
      } else {
        const subTree = instance.render.call(instance.proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance);
      }
    })
  }

  function mountComponent(initialVNode: any, container, parentComponent) {
    // 创建一个组件实例
    const instance = createComponentInstance(initialVNode, parentComponent);

    // 初始化组件
    setupComponent(instance);

    // 对组件进行初次渲染
    setupRenderEffect(instance, initialVNode, container);
  }

  // 处理Component
  function processComponent(n1, n2: any, container: any, parentComponent) {
    // 挂载组件
    mountComponent(n2, container, parentComponent);
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    mountChildren(n2.children, container, parentComponent);
  }

  function processText(n1, n2: any, container: any) {
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
        if (n2.shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
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
  }
}
