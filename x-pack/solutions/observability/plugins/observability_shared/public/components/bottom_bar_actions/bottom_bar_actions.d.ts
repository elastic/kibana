import React from 'react';
interface Props {
    unsavedChangesCount: number;
    isLoading: boolean;
    onDiscardChanges: () => void;
    onSave: () => void;
    saveLabel: string;
    appTestSubj: string;
    areChangesInvalid?: boolean;
}
export declare const BottomBarActions: ({ isLoading, onDiscardChanges, onSave, unsavedChangesCount, saveLabel, appTestSubj, areChangesInvalid, }: Props) => React.JSX.Element;
export {};
