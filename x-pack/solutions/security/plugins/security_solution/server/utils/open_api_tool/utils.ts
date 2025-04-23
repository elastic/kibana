import Oas from "oas"

export type Operation = ReturnType<Oas['operation']>
type OperationOrWebhook = ReturnType<Oas['getOperationById']>

export const isOperation = (operation: OperationOrWebhook): operation is Operation => {
    return operation.isWebhook() === false
}

/**
 * Formats the tool name to be a valid identifier.
 */
export const formatToolName = (toolName: string) => {
    return toolName.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, "_")
}

/**
 * Replaces objects like this:
 * {
 *  "items": {},
 *   "type": "array"
 * }
 * 
 * with this:
 * {
 *  "items": {
 *   "anyOf": [
 *    { "type": "string" },
 *    { "type": "number" },
 *    { "type": "boolean" },
 *    { "type": "object" }
 *   ]
 *  },
 *  "type": "array"
 * }
 * 
 * Since OpenAi does not support empty array items, we need to replace them with a more generic type.
 */
export const fixOpenApiSpecIteratively = (obj: any): any => {
    const stack: any[] = [obj];
    const result = obj;

    while (stack.length > 0) {
        const current = stack.pop();

        if (Array.isArray(current)) {
            current.forEach((item) => stack.push(item)); // Push array elements onto the stack
        } else if (current && typeof current === 'object') {
            // Check for the specific condition and replace it
            if (
                current.type === 'array' &&
                current.items &&
                typeof current.items === 'object' &&
                Object.keys(current.items).length === 0 &&
                Object.keys(current).length === 2
            ) {
                current.items = {
                    anyOf: [
                        { type: 'string' },
                        { type: 'number' },
                        { type: 'boolean' },
                        { type: 'object' }
                    ]
                };
            }

            // Push object properties onto the stack to continue the iteration
            Object.values(current).forEach((value) => stack.push(value));
        }
    }

    return result;
}