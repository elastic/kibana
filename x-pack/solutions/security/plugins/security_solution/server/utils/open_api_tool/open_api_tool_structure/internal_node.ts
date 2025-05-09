import { OperationNode } from "./operation_node";

export class InternalNode {
  name: string;
  description: string;
  children: Array<OperationNode | InternalNode>;
  constructor({
    name,
    description,
    children,
  }: {
    name: string;
    description: string;
    children: Array<OperationNode | InternalNode>;
  }) {
    this.name = name;
    this.description = description;
    this.children = children;
  }
}