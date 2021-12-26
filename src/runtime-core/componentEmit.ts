import { camelize, toHandleKey } from "../shared/index";

export function emit(instance, event, ...args) {
  //解构出props，被触发的函数其实已经以属性的形式挂载到当前组件实例上了
  //我们只需要匹配对应的函数名称，触发函数即可
  const { props } = instance;

  const eventName = toHandleKey(camelize(event));
  const handler = props[eventName];
  handler && handler(...args);
}
