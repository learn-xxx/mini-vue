import { hasOwn } from "../shared/index";

const PublicPropertiesMap = {
  $el: (i) => i.vnode.el,
};

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance;

    //查找值返回
    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    const publicGetter = PublicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
