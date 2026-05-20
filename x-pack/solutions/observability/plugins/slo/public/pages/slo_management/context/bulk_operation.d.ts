import React from 'react';
interface BulkOperationTask {
    taskId: string;
    operation: 'delete';
    status: 'in-progress' | 'completed' | 'failed';
    items: Array<{
        id: string;
        success: boolean;
        error?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
    error?: string;
}
interface RegisterBulkOperationTask {
    taskId: string;
    operation: 'delete';
    items: Array<{
        id: string;
    }>;
}
interface BulkOperationContext {
    tasks: BulkOperationTask[];
    register: (task: RegisterBulkOperationTask) => void;
}
export declare const useBulkOperation: () => BulkOperationContext;
declare const BulkOperationContext: React.Context<BulkOperationContext | undefined>;
export declare function BulkOperationProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export {};
