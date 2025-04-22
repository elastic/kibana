import Oas from "oas"

export type Operation = ReturnType<Oas['operation']>
type OperationOrWebhook = ReturnType<Oas['getOperationById']>

export const isOperation = (operation: OperationOrWebhook): operation is Operation => {
    return operation.isWebhook() === false
}

export const formatToolName = (toolName: string) => {
    return toolName.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, "_")
}