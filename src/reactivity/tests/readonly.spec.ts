import { readonly, isReadOnly, isProxy } from "../reactive";
describe("readonly", () => {
  it("happy path", () => {
    const original = { foo: 1, bar: { baz: 1 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(wrapped.foo).toBe(1);
    expect(isReadOnly(wrapped)).toBe(true);
    expect(isReadOnly(original)).toBe(false);
    expect(isReadOnly(wrapped.bar)).toBe(true);
    expect(isReadOnly(original.bar)).toBe(false);
    expect(isProxy(wrapped)).toBe(true);
  });
  it("warn when call set", () => {
    console.warn = jest.fn();
    const user = readonly({
      age: 10,
    });
    user.age = 11;
    expect(console.warn).toBeCalled();
  });
});
