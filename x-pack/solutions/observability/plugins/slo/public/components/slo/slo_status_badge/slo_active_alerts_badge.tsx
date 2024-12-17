/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';

export interface Props {
  viewMode?: 'compact' | 'default';
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
}

export function SloActiveAlertsBadge({ slo, activeAlerts, viewMode = 'default' }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleActiveAlertsClick = () => {
    if (activeAlerts) {
      const kuery = encodeURIComponent(
        `'slo.id:"${slo.id}" and slo.instanceId:"${slo.instanceId}"'`
      );
      navigateToUrl(
        `${basePath.prepend(
          observabilityPaths.alerts
        )}?_a=(kuery:${kuery},rangeFrom:now-15m,rangeTo:now,status:active)`
      );
    }
  };

  if (!activeAlerts) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.slo.slo.activeAlertsBadge.tooltip', {
          defaultMessage:
            '{count, plural, one {# burn rate alert} other {# burn rate alerts}}, click to view.',
          values: { count: activeAlerts },
        })}
        display="block"
      >
        <EuiBadge
          iconType="warning"
          color="danger"
          onClick={handleActiveAlertsClick}
          onClickAriaLabel={i18n.translate('xpack.slo.slo.activeAlertsBadge.ariaLabel', {
            defaultMessage: 'active alerts badge',
          })}
          data-test-subj="o11ySloActiveAlertsBadge"
          onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation(); // stops propagation of metric onElementClick
          }}
          css={{ cursor: 'pointer' }}
        >
          {viewMode !== 'default'
            ? activeAlerts
            : i18n.translate('xpack.slo.slo.activeAlertsBadge.label', {
                defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
                values: { count: activeAlerts },
              })}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  );
}
