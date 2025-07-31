/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiSkeletonText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface SloStatusProps {
  slo: SLOWithSummaryResponse;
  isLoading?: boolean;
}

interface StatusHealth {
  displayText: string;
  badgeColor: string;
}

type SLOStatus = 'HEALTHY' | 'DEGRADING' | 'VIOLATED' | 'NO_DATA';

export const displayStatus: Record<SLOStatus, StatusHealth> = {
  HEALTHY: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.healthy', {
      defaultMessage: 'Healthy',
    }),
    badgeColor: 'success',
  },

  DEGRADING: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.degrading', {
      defaultMessage: 'Degrading',
    }),
    badgeColor: 'warning',
  },
  VIOLATED: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.violated', {
      defaultMessage: 'Violated',
    }),
    badgeColor: 'danger',
  },
  NO_DATA: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.noData', {
      defaultMessage: 'No Data',
    }),
    badgeColor: 'default',
  },
};

export function SloStatusBadge({ slo, isLoading }: SloStatusProps) {
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={2} data-test-subj="loadingTitle" />;
  }
  return (
    <>
      <EuiFlexItem grow={false}>
        {slo.summary.status === 'NO_DATA' ? (
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.slo.sloStatusBadge.noDataTooltip', {
              defaultMessage: 'It may take some time before the data is aggregated and available.',
            })}
          >
            <EuiBadge color={displayStatus[slo.summary.status].badgeColor}>
              {displayStatus[slo.summary.status]?.displayText}
            </EuiBadge>
          </EuiToolTip>
        ) : (
          <EuiBadge color={displayStatus[slo.summary.status].badgeColor}>
            {displayStatus[slo.summary.status]?.displayText}
          </EuiBadge>
        )}
      </EuiFlexItem>

      {slo.summary.errorBudget.isEstimated && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">
            {i18n.translate('xpack.slo.sloStatusBadge.forecasted', {
              defaultMessage: 'Forecasted',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </>
  );
}
