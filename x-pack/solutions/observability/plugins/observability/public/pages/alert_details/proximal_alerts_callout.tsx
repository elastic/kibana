/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import { useFindProximalAlerts } from './hooks/use_find_proximal_alerts';
import { AlertData } from '../../hooks/use_fetch_alert_detail';

interface Props {
  alertDetail: AlertData;
  switchTabs: () => void;
}

export function ProximalAlertsCallout({ alertDetail, switchTabs }: Props) {
  const { euiTheme } = useEuiTheme();

  const { data, isError, isLoading } = useFindProximalAlerts(alertDetail);

  const count = data?.total;

  if (isLoading || isError || count === undefined || count < 0) {
    return null;
  }

  return (
    <EuiCallOut>
      {i18n.translate('xpack.observability.alertDetails.proximalAlert.description', {
        defaultMessage:
          '{count, plural, one {# alert was} other {# alerts were}} triggered around the same time.',
        values: {
          count,
        },
      })}
      {count > 0 && (
        <EuiLink
          data-test-id="see-proximal-alerts"
          data-test-subj="see-proximal-alerts"
          css={{ marginLeft: euiTheme.size.s }}
          onClick={() => switchTabs()}
        >
          {i18n.translate('xpack.observability.alertDetails.proximalAlert.action', {
            defaultMessage: 'See related alerts',
          })}{' '}
          <EuiIcon type={'arrowRight'} fontSize={'xs'} />
        </EuiLink>
      )}
    </EuiCallOut>
  );
}
