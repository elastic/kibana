/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { ActionConnector } from '../../../../common/rules/types';
import { kibanaService } from '../../state/kibana_service';
import { getUrlForAlert } from './common';

export const simpleAlertEnabled = (defaultActions: ActionConnector[], rule: Rule) => {
  const alertUrl = getUrlForAlert(rule.id, kibanaService.core.http.basePath.get());

  return {
    title: i18n.translate('xpack.uptime.overview.alerts.enabled.success', {
      defaultMessage: 'Rule successfully enabled ',
    }),
    text: toMountPoint(
      <RedirectAppLinks
        coreStart={{
          application: kibanaService.core.application,
        }}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.uptime.overview.alerts.enabled.success.description"
            defaultMessage="A message will be sent to {actionConnectors} when this monitor is down."
            values={{
              actionConnectors: (
                <strong>{defaultActions.map(({ name }) => name).join(', ')}</strong>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiLink data-test-subj="syntheticsSimpleAlertEnabledEditAlertLink" href={alertUrl}>
          {i18n.translate('xpack.uptime.enableAlert.editAlert', {
            defaultMessage: 'Edit alert',
          })}
        </EuiLink>
      </RedirectAppLinks>,
      kibanaService.core
    ),
  };
};
