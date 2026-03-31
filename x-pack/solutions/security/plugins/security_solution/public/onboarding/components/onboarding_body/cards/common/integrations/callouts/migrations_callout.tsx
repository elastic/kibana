/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiButton, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { IconAgent } from '../../../../../../../common/icons/agent';
import { SIEM_MIGRATIONS_CREATE_PATH } from '../../../../../../../../common/constants';

export const MigrationsCallout = React.memo(() => {
  return (
    <EuiPanel color="primary" hasShadow={false} paddingSize="l">
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <IconAgent aria-hidden={true} />
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <b>
            <FormattedMessage
              id="xpack.securitySolution.onboarding.migrations.callout.title"
              defaultMessage="Migrating from another SIEM?"
            />
          </b>{' '}
          <FormattedMessage
            id="xpack.securitySolution.onboarding.migrations.callout.description"
            defaultMessage="Streamline the process with automatic migration"
          />
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton href={SIEM_MIGRATIONS_CREATE_PATH}>
            <FormattedMessage
              id="xpack.securitySolution.onboarding.migrations.callout.button"
              defaultMessage="Start automatic migration"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

MigrationsCallout.displayName = 'MigrationsCallout';
