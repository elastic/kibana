/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiButton, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { SecurityPageName, useNavigateTo } from '@kbn/security-solution-navigation';
import { IconAgent } from '../../../../../../../common/icons/agent';
import { useGetSecuritySolutionUrl } from '../../../../../../../common/components/link_to';

export const MigrationsCallout = memo(() => {
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const href = useMemo(
    () => getSecuritySolutionUrl({ deepLinkId: SecurityPageName.siemMigrationsManage }),
    [getSecuritySolutionUrl]
  );
  const onClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      navigateTo({ deepLinkId: SecurityPageName.siemMigrationsManage });
    },
    [navigateTo]
  );

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
          <EuiButton href={href} onClick={onClick}>
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
