
import { effect } from '../reactivity/effect';
import { genSpace, genVNodeFeature, getUpNum, once, printSentence, printStage, printTip } from '../shared/TestUtil';
import { ShapeFlags } from '../shared/ShapeFlags';
import { createComponentInstance, setupComponent } from './component';
import { createAppAPI } from './createApp';
import { shouldUpdateComponent } from './componentUpdateUtils'
import { queueJobs } from './scheduler';
import { EMPTY_OBJ } from '../shared';
import { cloneDeep } from 'lodash-es'

export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');


const printTip1 = once(printTip)
const printTip2 = once(printTip)
const printStage1 = once(printStage);
const printSentence2 = once(printSentence);
const printSentence3 = once(printSentence);
const printSentence4 = once(printSentence);
const printSentence5 = once(printSentence);

export function createRenderer(options) {

  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProps,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText
  } = options;

  // 挂载孩子结点
  function mountChildren(children: any, container: any, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function mountElement(vnode: any, container: any, parentComponent, anchor) {
    // 将 DOM实例 绑定到vnode上，我们可以在后续的业务中直接访问DOM实例
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { props, children, shapeFlag } = vnode;
    // 判断是否包含子结点，如果包含，也进行patch操作
    // 此处其实可以发现是一个递归的过程
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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
  function processElement(n1, n2: any, container, parentComponent, anchor) {
    const num = getUpNum()
    if (!n1) {
      printStage(genSpace(num) + '【元素' + num + '】:第一次挂载', n2.type, '元素开始');
      // 挂载element
      mountElement(n2, container, parentComponent, anchor);
      printStage(genSpace(num) + '【元素' + num + '】:第一次挂载', n2.type, '元素开始');

    } else {
      printStage(genSpace(num) + '【元素' + num + '】:更新', n2.type, '元素开始');

      patchElement(n1, n2, container, parentComponent, anchor);
      printStage(genSpace(num) + '【元素' + num + '】:更新', n2.type, '元素开始');

    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log('n1:', n1)
    console.log('n2:', n2)

    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    const el = (n2.el = n1.el);

    patchChildren(n1, n2, el, parentComponent, anchor);
    patchProps(el, oldProps, newProps);
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const prevShapeFlag = n1.shapeFlag;
    const c1 = n1.children
    const { shapeFlag, children: c2 } = n2;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 删除老的children 
        unmountedChildren(n1.children);
      }
      if (c1 !== c2) {
        // 设置文本
        hostSetElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        patchKeyChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyChildren(c1, c2, container, parentComponent, anchor) {
    let i = 0; // 当前对比的结点
    const l2 = c2.length; // 新结点的长度
    let e1 = c1.length - 1; // 旧结点的最后索引
    let e2 = l2 - 1; // 新节点的最后索引

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
      } else {
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
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // 新的比老的多 创建
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null
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
      let patched = 0;// 已经更新的结点数
      // 建立索引表，存储新节点的key与索引的关系
      const keyToNewIndexMap = new Map();
      // 建立数组，存储中间部分的 新节点和旧结点的索引关系
      const newIndexToOldIndexMap = new Array(toBePatch);
      // 初始化数组
      for (let i = 0; i < toBePatch; i++) newIndexToOldIndexMap[i] = -1;

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
        } else {
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
          } else {
            moved = true;
          }
          // 在这里我们可以认为新结点就是存在的
          // newIndex表示节点的新索引，s2表示中间部分的开头，数组长度为应该更新的结点数量
          // 所以需要相减，获得 在新旧位置对应的数组 中的相对位置
          // i代表旧结点的索引，记录下来
          // 后续可能会基于这个去计算 最长递增子序列的索引数组，来判断后续哪一些结点不需要移动
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
        } else if (moved) {
          // 不相等说明需要交换位置
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(targetChild.el, container, anchor);
          } else {
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

  function setupRenderEffect(instance: any, initialVNode, container, anchor) {
    instance.update = effect(() => {
      if (!instance.isMounted) {
        // 我们取出实例中的proxy，将render函数中的this指向proxy
        // 那么在后续使用this.xxx获取值中，会调用proxy的getter方法
        // 因为我们在初始化组件时，已经对proxy的getter进行了定义
        // 从而实现使用this.xxx来方便地获取我们需要的值
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy, proxy));
        printSentence4('3.执行实例的render函数，渲染子节点', cloneDeep(subTree));
        printTip2('执行render函数时，我们使用bind方法，把我们之前创建的数据代理对象proxy作为函数的this，实现在子组件中通过this.xxx来方便地获取我们需要的值。');
        // 递归调用
        printStage('开始递归渲染子组件...')
        // eslint-disable-next-line no-use-before-define
        patch(null, subTree, container, instance, anchor);

        // 在subTree渲染完成后，绑定$el根节点 
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        printTip1('初始化实例状态时，其实被effect包裹着，当我们创建响应式数据时，会进行依赖（也就是说渲染过程本身就是一个依赖）收集，当我们响应式数据发生改变时，就会触发渲染逻辑重新运行。')
        const { nextVNode, vnode } = instance; // vnode是旧虚拟结点，next是新虚拟结点
        // 如果有nextVNode，说明组件需要更新
        if (nextVNode) {
          nextVNode.el = vnode.el;
          updateComponentPreRender(instance, nextVNode);
        }
        const { proxy } = instance
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
    })
  }

  function updateComponentPreRender(instance, nextVNode) {
    // 更新实例上的值
    instance.vnode = nextVNode;
    instance.nextVNode = null;
    instance.props = nextVNode.props;
  }

  function mountComponent(initialVNode: any, container, parentComponent, anchor) {
    // 创建一个组件实例
    // 在vnode上保留实例，在更新的时候可以重新获取到render函数
    const instance = (initialVNode.componentInstance = createComponentInstance(initialVNode, parentComponent));
    printSentence2('1.先创建组件 ' + initialVNode.type.name + ' 的实例:', cloneDeep(instance));
    // 初始化组件
    setupComponent(instance);
    printSentence3('2.对组件进行初始化，例如props、slots、创建代理对象proxy等，当前实例:', cloneDeep(instance));
    // 对组件进行初次渲染
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  // 处理Component
  function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
    const num = getUpNum();
    if (!n1) {
      printStage(genSpace(num) + '【组件' + num + '】第一次挂载:' + n2.type.name + '开始')
      // 挂载组件
      mountComponent(n2, container, parentComponent, anchor);
      printStage(genSpace(num) + '【组件' + num + '】第一次挂载:' + n2.type.name + '结束')
    } else {
      printStage(genSpace(num) + '【组件' + num + '】更新:' + n2.type.name + '开始')
      updateComponent(n1, n2);
      printStage(genSpace(num) + '【组件' + num + '】更新:' + n2.type.name + '结束')
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
    } else {
      n2.el = n1.el;
      n2.vnode = n2;
    }

  }

  function processFragment(n1, n2: any, container: any, parentComponent, anchor) {
    const num = getUpNum()
    printStage(genSpace(num) + 'Fragment' + num + '】渲染:' + n2.type.name + '开始')
    mountChildren(n2.children, container, parentComponent, anchor);
    printStage(genSpace(num) + 'Fragment' + num + '】渲染:' + n2.type.name + '结束')
  }

  function processText(n1, n2: any, container: any) {
    const num = getUpNum()
    printStage(genSpace(num) + '文本' + num + '】渲染:' + n2.type.name + '开始')
    const el = (n2.el = document.createTextNode(n2.children));
    container.append(el);
    printStage(genSpace(num) + '文本' + num + '】渲染:' + n2.type.name + '结束')
  }

  const printVNodeFeature = once(printSentence);

  // 处理虚拟结点vnode，n1代表旧的结点，n2代表新的结点
  function patch(n1, n2, container, parentComponent, anchor) {
    printVNodeFeature(...genVNodeFeature(n2));
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
        if (n2.shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {

          processComponent(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }

  function render(vnode, container, parentComponent) {
    printStage('开始根据vnode渲染成HTML元素')
    // patch
    patch(null, vnode, container, parentComponent, null);
  }

  return {
    // 利用闭包，导出定义好的接口
    createApp: createAppAPI(render)
  }
}

function getSequence(arr) {
  // 备份
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    // 当前索引的值
    const arrI = arr[i];
    // 排除了等于0的情况
    // 原因是0成为了diff算法中的占位符，不影响对算法的了解
    if (arrI !== 0) {
      // 用当前num与result中的最后一项对比
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        // 当前数值大于result子序列最后一项时，直接往后新增，并将当前数值的前一位result保存
        p[i] = j;
        // 加到结果中
        result.push(i);
        continue;
      }
      // 最大值大于当前值（数组不包含重复值）
      u = 0;
      v = result.length - 1;
      // 二分查找，找到第一个大于当前值的数的在result数组中的索引
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        }
        else {
          v = c;
        }
      }
      // arr[result[u]] 表示
      if (arrI < arr[result[u]]) {
        // 找到下标，将当前下标对应的前一位result保存
        // (如果找到的是第一位，不需要操作，第一位前面没有了)
        if (u > 0) {
          p[i] = result[u - 1];
        }
        // 找到下标，直接替换result中的数值
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  // 回溯，直接从最后一位开始，将前面的result全部覆盖，
  // 如果不需要修正，则p中记录的每一项都是对应的前一位，不会有任何影响
  while (u-- > 0) {
    result[u] = v;
    // p[v]记录了该位的前一个result的最后一项
    v = p[v];
  }
  return result;
}
