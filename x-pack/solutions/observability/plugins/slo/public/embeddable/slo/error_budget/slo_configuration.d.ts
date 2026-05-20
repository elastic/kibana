import React from 'react';
import type { ErrorBudgetCustomState } from '../../../../common/embeddables/error_budget/types';
interface SloConfigurationProps {
    onCreate: (props: ErrorBudgetCustomState) => void;
    onCancel: () => void;
}
export declare function SloConfiguration({ onCreate, onCancel }: SloConfigurationProps): React.JSX.Element;
export {};
