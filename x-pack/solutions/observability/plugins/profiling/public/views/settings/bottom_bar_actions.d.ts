import React from 'react';
interface Props {
    unsavedChangesCount: number;
    isLoading: boolean;
    onDiscardChanges: () => void;
    onSave: () => void;
    saveLabel: string;
    areChangesInvalid?: boolean;
}
export declare function BottomBarActions({ isLoading, onDiscardChanges, onSave, unsavedChangesCount, saveLabel, areChangesInvalid, }: Props): React.JSX.Element;
export {};
