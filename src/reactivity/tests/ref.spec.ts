import { effect } from "../effect";
import { reactive } from "../reactive";
import { isRef, proxyRefs, ref, unRef } from "../ref";
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

  it("isRef", () => {
    const foo = ref(1);
    const user = reactive({
      age: 1,
    });
    expect(isRef(foo)).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef(user)).toBe(false);
  });

  it("unRef", () => {
    const foo = ref(1);
    expect(unRef(foo)).toBe(1);
    expect(unRef(1)).toBe(1);
  });

  it("proxyRefs", () => {
    const user = {
      age: ref(10),
      name: "merlin",
    };

    const proxyUser = proxyRefs(user);

    //get
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);
    expect(proxyUser.name).toBe("merlin");

    //set
    proxyUser.age = ref(10);
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);
  });
});
