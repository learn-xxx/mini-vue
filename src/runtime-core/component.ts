import { shallowReadonly } from "../reactivity/reactive";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initProps } from "./componentProps";
import { emit } from "./componentEmit";
import { initSlots } from "./componentSlot";
import { proxyRefs } from "../reactivity/ref";
import { instanceToTable, once, printSentence, printStage, printTable, printTip } from "../shared/TestUtil";
import { cloneDeep } from 'lodash-es'

let compiler;

const printInstanceStructure = once(printTable);

export function createComponentInstance(vnode, parent) {
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
  componentInstance.emit = emit.bind(null, componentInstance) as any;
  printInstanceStructure('组件instance的基本结构：', instanceToTable(cloneDeep(componentInstance)))
  return componentInstance;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children)
  //处理setup返回值，初始化一个有状态的component
  setupStatefulComponent(instance);
}

const printTip1 = once(printTip)
const printStage1 = once(printStage);
const printStage2 = once(printStage);
const printSentence1 = once(printSentence);

function setupStatefulComponent(instance: any) {
  const Component = instance.type;

  //创建代理
  printTip1('代理对象proxy是属于组件实例的，通过劫持get操作，判断数据是来自props、setupState等，返回数据的结果')
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  const { setup } = Component;

  if (setup) {
    // 此处赋值全局变量，实现获取组件实例
    setCurrentInstance(instance);
    //setup()返回可能是function或object
    //如果是function，我们认为是组件的render函数
    //如果是object，则将返回的内容注入到上下文中
    printStage1('【runtime】开始执行组件setup函数');
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    printSentence1('setup函数执行结果为：', setupResult);
    printStage2('【runtime】setup函数执行完成');
    setCurrentInstance(null);
    // 处理setup返回的结果
    handleSetupResult(instance, setupResult);
  }
}

const printStage3 = once(printStage);
const printStage4 = once(printStage);
const printStage5 = once(printStage);
const printStage6 = once(printStage);

function handleSetupResult(instance, setupResult: any) {
  //function
  //TODO function

  if (typeof setupResult === "object") {
    // 提前解构，后续可以直接获取值
    instance.setupState = proxyRefs(setupResult);
  }

  //完成组件的初始化
  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  printStage5('【runtime】处理转化render函数');

  const Component = instance.type;

  if (compiler && !Component.render) {
    if (Component.template) {
      printStage3('【compiler】通过编译器将模板转化为render函数');
      Component.render = compiler(Component.template)
      printStage4('【compiler】编译转化完成');
    }
  }

  if (Component.render) {
    instance.render = Component.render;
  }
  printStage6('【runtime】处理render函数完成');

}

let currentInstance: any = null;

export function getCurrentInstance() {
  return currentInstance
}

export function setCurrentInstance(instance: any) {
  currentInstance = instance
}


export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler
}
