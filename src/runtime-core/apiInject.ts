import { getCurrentInstance } from "./component";

export function provide(key,value){
  // 存在哪里
  const currentInstance = getCurrentInstance();

  if(currentInstance){
    let {provides} = currentInstance;
    // 我们要实现的点是，如果当前这个组件使用了provide，
    // 那么我们要对provides进行重新赋值，将provides的原型指向父级组件的provides
    // 再对将key和value赋值到provides上
    const parentProvides = currentInstance.parent && currentInstance.parent.provides;
    // init，只有在初始化的时候才创建
    if(provides === parentProvides){
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

export function inject(key,defaultValue){
  const currentInstance = getCurrentInstance();
if(currentInstance){
  const parentProvides = currentInstance.parent.provides;
  if(key in parentProvides){
    return parentProvides[key];
  }else{
    if(typeof defaultValue === 'function'){
      return defaultValue();
    }
    return defaultValue;
  }
}
}
