/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ProtectionUpdatesWarningPanel = () => (
  <EuiCallOut
    title={i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.warningPanel.title', {
      defaultMessage: 'Attention',
    })}
    iconType="alert"
    data-test-subj="protection-updates-warning-callout"
  >
    <FormattedMessage
      id="xpack.securitySolution.endpoint.protectionUpdates.warningPanel.content"
      defaultMessage="Elastic provides periodic updates to protections artifacts such as the global exception list, malware models, and rule packages to ensure your environment is up to date with latest protections. By default, these artifacts are updated automatically. Disable the automatic updates toggle to manually manage updates to the protections artifacts."
    />
    <EuiSpacer size="s" />
    <FormattedMessage
      id="xpack.securitySolution.endpoint.protectionUpdates.warningPanel.content.note"
      defaultMessage="{note} It is strongly advised to keep automatic updates enabled to ensure the highest level of security for your environment. Proceed with caution if you decide to disable automatic updates."
      values={{
        note: (
          <strong>
            {i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.warningPanel.content.note.bold',
              {
                defaultMessage: 'Note:',
              }
            )}
          </strong>
        ),
      }}
    />
  </EuiCallOut>
);
