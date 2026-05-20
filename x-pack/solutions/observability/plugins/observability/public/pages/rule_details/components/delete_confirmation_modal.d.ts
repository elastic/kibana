import React from 'react';
interface DeleteConfirmationPropsModal {
    ruleIdToDelete: string | undefined;
    title: string;
    onCancel: () => void;
    onDeleted: () => void;
    onDeleting: () => void;
}
export declare function DeleteConfirmationModal({ ruleIdToDelete, title, onCancel, onDeleted, onDeleting, }: DeleteConfirmationPropsModal): React.JSX.Element | null;
export {};
