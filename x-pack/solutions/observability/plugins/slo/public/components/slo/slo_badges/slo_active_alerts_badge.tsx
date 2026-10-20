/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { observabilityAppId } from '@kbn/observability-plugin/common';
import { encode } from '@kbn/rison';
import { ALL_VALUE, type SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { MouseEvent } from 'react';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';

export interface Props {
  viewMode?: 'compact' | 'default';
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
  isInteractive?: boolean;
}

export function SloActiveAlertsBadge({
  slo,
  activeAlerts,
  viewMode = 'default',
  isInteractive = true,
}: Props) {
  const {
    application: { navigateToApp },
  } = useKibana().services;

  const handleActiveAlertsClick = () => {
    if (activeAlerts) {
      const encodedKuery = encode({
        kuery:
          slo.instanceId !== ALL_VALUE
            ? `slo.id:"${slo.id}" and slo.instanceId:"${slo.instanceId}"`
            : `slo.id:"${slo.id}"`,
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        status: 'active',
      });
      void navigateToApp(observabilityAppId, {
        path: `/alerts?_a=${encodedKuery}`,
        openInNewTab: true,
      });
    }
  };

  if (!activeAlerts) {
    return null;
  }

  const label =
    viewMode !== 'default'
      ? activeAlerts
      : i18n.translate('xpack.slo.slo.activeAlertsBadge.label', {
          defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
          values: { count: activeAlerts },
        });

  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // stops propagation of metric onElementClick
  };

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.slo.slo.activeAlertsBadge.tooltip', {
          defaultMessage:
            '{count, plural, one {# burn rate alert} other {# burn rate alerts}}. Opens in a new browser tab.',
          values: { count: activeAlerts },
        })}
        display="block"
      >
        {isInteractive ? (
          <EuiBadge
            iconType="warning"
            color="danger"
            data-test-subj="o11ySloActiveAlertsBadge"
            onMouseDown={handleMouseDown}
            css={{ cursor: 'pointer' }}
            onClick={handleActiveAlertsClick}
            onClickAriaLabel={i18n.translate('xpack.slo.slo.activeAlertsBadge.ariaLabel', {
              defaultMessage: 'View active alerts in a new browser tab',
            })}
          >
            {label}
          </EuiBadge>
        ) : (
          <EuiBadge
            iconType="warning"
            color="danger"
            data-test-subj="o11ySloActiveAlertsBadge"
            onMouseDown={handleMouseDown}
          >
            {label}
          </EuiBadge>
        )}
      </EuiToolTip>
    </EuiFlexItem>
  );
}
