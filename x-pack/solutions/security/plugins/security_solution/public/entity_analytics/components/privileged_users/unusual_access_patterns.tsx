/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiInMemoryTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Alert } from '@kbn/alerting-types';
import { DocumentDetailsRightPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type { PrivilegedUserDoc } from '../../../../common/api/entity_analytics/privmon';
import { HeaderSection } from '../../../common/components/header_section';
import { PrivilegedUserName } from './privileged_user_name';
import { TimelineId } from '../../../../common/types';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface UnusualAccessPatternsProps {
  alerts: Alert[];
  privilegedUsers: PrivilegedUserDoc[];
  isLoading: boolean;
}

export const UnusualAccessPatterns = React.memo(
  ({ alerts, privilegedUsers, isLoading }: UnusualAccessPatternsProps) => {
    const { openFlyout } = useExpandableFlyoutApi();
    const openAlertDetailsPreview = useCallback(
      (alertId?: string) => {
        openFlyout({
          right: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: alertId,
              indexName: '.alerts-security.alerts-default', // PoC baby!
              scopeId: TimelineId.casePage,
            },
          },
        });
      },
      [openFlyout]
    );
    return (
      <EuiPanel hasBorder>
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={'Unusual access patterns'}
          titleSize="s"
          showInspectButton={false}
        />
        <EuiInMemoryTable
          items={alerts}
          columns={getTableColumns(privilegedUsers, openAlertDetailsPreview)}
          loading={isLoading}
          pagination={{
            pageSizeOptions: [5, 10, 20],
            initialPageSize: 5,
          }}
        />
        <EuiSpacer size="m" />
      </EuiPanel>
    );
  }
);

UnusualAccessPatterns.displayName = 'UnusualAccessPatterns';

const getTableColumns = (
  privilegedUsers: PrivilegedUserDoc[],
  openAlertDetailsPreview: (alertId: string) => void
) => [
  {
    render: (alert: Alert) => (
      <EuiButtonIcon
        aria-label="View details"
        iconType="inspect"
        onClick={() => {
          if (alert['kibana.alert.uuid']) {
            openAlertDetailsPreview(alert['kibana.alert.uuid'] as unknown as string);
          }
        }}
      />
    ),
    width: '5%',
  },
  {
    field: 'kibana.alert.rule.name',
    name: 'Rule',
    truncateText: true,
    width: '35%',
  },
  {
    field: 'user.name',
    name: 'User',
    render: (name: string, alert: Alert) => {
      const privilegedUser = privilegedUsers.find(({ user }) => user.name === name[0]);

      if (!privilegedUser) {
        return name;
      }

      return <PrivilegedUserName privilegedUser={privilegedUser} />;
    },
    width: '25%',
  },
  {
    field: '@timestamp',
    name: 'Time',
    render: (time: string) => {
      return <FormattedRelativePreferenceDate value={time} />;
    },
    width: '35%',
  },
];
