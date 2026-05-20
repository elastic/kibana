import React, { type ComponentProps } from 'react';
import type { GetObservabilityAlertsTableProp } from '../..';
export declare function AlertsTableExpandedAlertView({ pageIndex, pageSize, expandedAlertIndex, onExpandedAlertIndexChange, alerts, alertsCount, isLoading, tableId, observabilityRuleTypeRegistry, }: ComponentProps<GetObservabilityAlertsTableProp<'renderExpandedAlertView'>>): React.JSX.Element | null;
