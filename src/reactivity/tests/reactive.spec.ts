import { isReactive, isReadOnly } from "../../shared";
import { reactive } from "../reactive";

describe("reactive", () => {
  it("main", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isReadOnly(observed)).toBe(false);
  });
});
