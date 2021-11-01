import { isObject } from '../shared';
import {track,trigger} from './effect'
export function reactive(target){
  if(!isObject(target)){
    return target
  }
  //直接返回一个Proxy对象，实现响应式
  const proxy =  new Proxy(target,{
    get:(target,key,receiver)=>{
      const res = Reflect.get(target,key,receiver);
      //收集依赖
      track(target,key)
      return res
    },
    set:(target,key,value,receiver)=>{
      const res = Reflect.set(target,key,value,receiver);
      //触发依赖
      trigger(target,key)
      return res
    }
  })
  return proxy
}