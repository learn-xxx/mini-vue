export * from './runtime-dom'

import { baseComplie } from './compiler-core/src'
import * as runtimeDom from './runtime-dom'
import { registerRuntimeCompiler } from './runtime-core'

function compileToFunction(template) {
  const { code } = baseComplie(template)
  console.log(code)
  const render = new Function('Vue', code)(runtimeDom)
  return render;
}

registerRuntimeCompiler(compileToFunction)
