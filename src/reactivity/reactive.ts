export function reactive(target){
  //直接返回一个Proxy对象，实现响应式
  return new Proxy(target,{
    get:(target,key)=>{
      const res = Reflect.get(target,key);
      return res
    },
    set:(target,key,value)=>{
      const res = Reflect.set(target,key,value);
      return res
    }
  })
}