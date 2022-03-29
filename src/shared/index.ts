export function isObject(target) {
  return typeof target === "object" && target !== null;
}

export const extend = Object.assign;

export const EMPTY_OBJ = {};

export const hasChanged = (val, newVal) => {
  return !Object.is(val, newVal);
};

//call使this指向target，查找target中是否有某个属性
export const hasOwn = (target, key) =>
  Object.prototype.hasOwnProperty.call(target, key);

//转化为事件名（on开头）
export const toHandleKey = (str: string) => {
  return str ? "on" + capitalize(str) : "";
};

//把首字母转化为大写
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

//烤串式命名转化为驼峰式命名
export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : "";
  });
};
