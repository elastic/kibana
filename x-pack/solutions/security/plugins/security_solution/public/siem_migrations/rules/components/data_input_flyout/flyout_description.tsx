/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiLink } from '@elastic/eui';
import { useNavigation } from '../../../../common/lib/kibana';

export const FlyoutDescription = React.memo(() => {
  const { navigateTo } = useNavigation();
  return (
    <EuiText>
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.description"
        defaultMessage="First, upload your rules. AI will identify any related integrations, macros, and lookups. To set index patterns, go to {AdvancedSettingsLink}."
        values={{
          AdvancedSettingsLink: (
            <EuiLink
              onClick={() => {
                navigateTo({
                  appId: 'management',
                  path: '/kibana/dataViews',
                });
              }}
              target="_blank"
              rel="noopener"
              external
              data-test-subj="siemMigrationsAdvancedSettingsLink"
            >
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.advancedSettingsLinkText"
                defaultMessage="Advanced Settings"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
});

FlyoutDescription.displayName = 'FlyoutDescription';
