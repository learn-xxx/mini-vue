import { isReadOnly } from "../../shared";
import { readonly } from "../reactive";
describe("readonly", () => {
  it("happy path", () => {
    const original = { foo: 1, bar: { baz: 1 } };
    const wrapper = readonly(original);
    expect(wrapper).not.toBe(original);
    expect(wrapper.foo).toBe(1);
    expect(isReadOnly(wrapper)).toBe(true);
    expect(isReadOnly(original)).toBe(false);
    expect(isReadOnly(wrapper.bar)).toBe(true);
    expect(isReadOnly(original.bar)).toBe(false);
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
