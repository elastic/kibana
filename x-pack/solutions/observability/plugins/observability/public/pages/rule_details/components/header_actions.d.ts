import React from 'react';
interface HeaderActionsProps {
    ruleId: string;
    isLoading: boolean;
    isRuleEditable: boolean;
    onDeleteRule: () => void;
    onEditRule: () => void;
}
export declare function HeaderActions({ ruleId, isLoading, isRuleEditable, onDeleteRule, onEditRule, }: HeaderActionsProps): React.JSX.Element | null;
export {};
