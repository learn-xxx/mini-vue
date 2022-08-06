const queue: any[] = []
const p = Promise.resolve();
let isFlushPending = false;

// nextTick是在更改响应式数据之后才调用的
// 而响应式数据改变会更新结点，需要操作dom，也会生成微任务，
// 因为调用的时机所以nextTick肯定是排在其之后
export function nextTick(fn) {
  return fn ? p.then(fn) : p;
}

// 在调用挂载流程时，会执行scheduler，加入一个渲染任务
// 微任务只会被加进一次，每次执行都会取出所有队列任务来执行
export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  queueFlush();
}

function queueFlush() {
  // 没有处于等待状态，处在第一个任务进queue的情况。
  if (isFlushPending) return;
  // 表示已经把queue的执行的微任务加到事件队列中了。
  isFlushPending = true
  nextTick(flushJobs);
}

function flushJobs() {
  // 执行完之后恢复原状
  isFlushPending = false
  let job;
  while (job = queue.shift()) {
    job && job();
  }
}
