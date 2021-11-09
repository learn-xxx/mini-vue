import { effect } from "../effect";
import { ref } from "../ref";
describe("ref", () => {
  it("happy path", () => {
    const foo = ref(1);
    expect(foo.value).toBe(1);
  });

  it("should be reactive", () => {
    const foo = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = foo.value;
    });
    expect(calls).toBe(1);
    expect(dummy).toBe(1);
    foo.value = 2;
    expect(foo.value).toBe(2);
    expect(dummy).toBe(2);

    // check same value
    foo.value = 2;
    expect(foo.value).toBe(2);
    expect(dummy).toBe(2);
  });

  it("should make nested properties reactive", () => {
    const foo = ref({ bar: 1 });
    let dummy;
    effect(() => {
      dummy = foo.value.bar;
    });
    expect(dummy).toBe(1);
    foo.value.bar = 2;
    expect(dummy).toBe(2);
  });
});
