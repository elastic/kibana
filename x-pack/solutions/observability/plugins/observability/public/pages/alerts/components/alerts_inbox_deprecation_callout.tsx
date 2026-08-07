/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERTS_INBOX_PATH, OBSERVABILITY_BASE_PATH } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';

/**
 * POC callout directing users from classic Alerts to the Alerting v2 Inbox.
 */
export function AlertsInboxDeprecationCallout() {
  const { http } = useKibana().services;
  const inboxHref = http.basePath.prepend(`${OBSERVABILITY_BASE_PATH}${ALERTS_INBOX_PATH}`);

  return (
    <EuiCallOut
      title={i18n.translate('xpack.observability.alerts.inboxDeprecationCallout.title', {
        defaultMessage: 'This page will be deprecated',
      })}
      color="warning"
      iconType="warning"
      data-test-subj="alertsInboxDeprecationCallout"
    >
      <p>
        {i18n.translate('xpack.observability.alerts.inboxDeprecationCallout.description', {
          defaultMessage:
            'Alerts inbox is the new default alert experience. It brings together all internal and external alerts in one place.',
        })}
      </p>
      <EuiButton
        href={inboxHref}
        color="warning"
        fill
        size="s"
        data-test-subj="alertsInboxDeprecationCalloutGoToInbox"
      >
        {i18n.translate('xpack.observability.alerts.inboxDeprecationCallout.goToInbox', {
          defaultMessage: 'Go to Inbox',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
