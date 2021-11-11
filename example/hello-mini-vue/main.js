import { App } from "./App.js";
import { createApp } from "../../lib/mini-vue.esm.js";
const app = document.querySelector("#app");
createApp(App).mount(app);
