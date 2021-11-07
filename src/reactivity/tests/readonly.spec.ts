import { readonly } from "../reactive";
describe("readonly", () => {
  it("happy path", () => {
    const original = { foo: 1, bar: { baz: 1 } };
    const wrapper = readonly(original);
    expect(wrapper).not.toBe(original);
    expect(wrapper.foo).toBe(1);
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
