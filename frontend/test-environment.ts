import { builtinEnvironments, type Environment } from "vitest/runtime";

export default {
  ...builtinEnvironments.jsdom,
  async setup(global, options) {
    const { AbortController, AbortSignal } = global;
    const environment = await builtinEnvironments.jsdom.setup(global, options);
    global.AbortController = AbortController;
    global.AbortSignal = AbortSignal;
    return environment;
  },
} satisfies Environment;
