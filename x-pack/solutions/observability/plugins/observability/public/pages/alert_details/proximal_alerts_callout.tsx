/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useFindProximalAlerts } from './hooks/use_find_proximal_alerts';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';

interface Props {
  alertDetail: AlertData;
  switchTabs: () => void;
}

export function ProximalAlertsCallout({ alertDetail, switchTabs }: Props) {
  const { data, isError, isLoading } = useFindProximalAlerts(alertDetail);

  const count = data?.total;

  if (isLoading || isError || count === undefined || count < 0) {
    return null;
  }

  return (
    <KbnInfoCallout
      title={i18n.translate('xpack.observability.alertDetails.proximalAlert.description', {
        defaultMessage:
          '{count, plural, one {# alert was} other {# alerts were}} triggered around the same time.',
        values: {
          count,
        },
      })}
      actionProps={
        count > 0
          ? {
              primary: {
                'data-test-subj': 'see-proximal-alerts',
                onClick: () => switchTabs(),
                children: i18n.translate('xpack.observability.alertDetails.proximalAlert.action', {
                  defaultMessage: 'See related alerts',
                }),
                iconType: 'chevronSingleRight',
                iconSide: 'right',
              },
            }
          : undefined
      }
    />
  );
}
