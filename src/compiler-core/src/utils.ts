import { NodeTypes } from "./ast";

export const isText = (node) => node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION

