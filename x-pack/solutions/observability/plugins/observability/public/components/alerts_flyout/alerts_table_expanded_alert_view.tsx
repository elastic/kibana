/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { EuiFlexGroup, EuiFlexItem, EuiPagination, EuiSpacer } from '@elastic/eui';
import { ALERT_FLYOUT_PAGINATION_ARIA_LABEL } from '@kbn/response-ops-alerts-table/translations';
import type { GetObservabilityAlertsTableProp } from '../..';
import AlertsFlyout from './alerts_flyout';

export function AlertsTableExpandedAlertView({
  pageIndex,
  pageSize,
  expandedAlertIndex,
  onExpandedAlertIndexChange,
  alerts,
  alertsCount,
  isLoading,
  tableId,
  observabilityRuleTypeRegistry,
}: ComponentProps<GetObservabilityAlertsTableProp<'renderExpandedAlertView'>>) {
  const alertIndexInPage = expandedAlertIndex - pageIndex * pageSize;
  if (alertIndexInPage < 0 || alertIndexInPage >= alerts.length || pageSize <= 0) {
    onExpandedAlertIndexChange(null);
    return null;
  }
  const expandedAlertPage = Math.floor(expandedAlertIndex / pageSize);
  // This can be undefined when a new page of alerts is still loading
  const alert = alerts[alertIndexInPage] as Alert | undefined;

  return (
    <AlertsFlyout
      alert={expandedAlertPage === pageIndex ? alert : undefined}
      isLoading={isLoading}
      tableId={tableId}
      onClose={() => {
        onExpandedAlertIndexChange?.(null);
      }}
      observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      headerAppend={
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiPagination
                aria-label={ALERT_FLYOUT_PAGINATION_ARIA_LABEL}
                pageCount={alertsCount}
                activePage={expandedAlertIndex}
                onPageClick={(activePage) => {
                  onExpandedAlertIndexChange?.(activePage);
                }}
                compressed
                data-test-subj="alertFlyoutPagination"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
    />
  );
}
