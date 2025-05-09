export class OperationNode {
  operationId: string;
  constructor({ operationId }: { operationId: string }) {
    this.operationId = operationId;
  }
}