import React from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
export interface AlertsFlyoutProps {
    alert?: Alert;
    isLoading?: boolean;
    tableId?: string;
    onClose: () => void;
    headerAppend?: React.ReactNode;
    observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}
export declare function AlertsFlyout({ alert, isLoading, tableId, onClose, observabilityRuleTypeRegistry, headerAppend, }: AlertsFlyoutProps): React.JSX.Element;
export default AlertsFlyout;
