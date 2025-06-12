/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import {
  SecurityPageName,
  useNavigation,
  NavigationProvider,
} from '@kbn/security-solution-navigation';
import type { ToastInput } from '@kbn/core-notifications-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { RuleMigrationStats } from '../../types';

export const getSuccessToast = (migration: RuleMigrationStats, core: CoreStart): ToastInput => ({
  color: 'success',
  iconType: 'check',
  toastLifeTimeMs: 1000 * 60 * 30, // 30 minutes
  title: i18n.translate('xpack.securitySolution.siemMigrations.rulesService.polling.successTitle', {
    defaultMessage: 'Rules translation complete.',
  }),
  text: toMountPoint(
    <NavigationProvider core={core}>
      <SuccessToastContent migration={migration} />
    </NavigationProvider>,
    core
  ),
});

const SuccessToastContent: React.FC<{ migration: RuleMigrationStats }> = ({ migration }) => {
  const navigation = { deepLinkId: SecurityPageName.siemMigrationsRules, path: migration.id };

  const { navigateTo, getAppUrl } = useNavigation();
  const onClick: React.MouseEventHandler = (ev) => {
    ev.preventDefault();
    navigateTo(navigation);
  };
  const url = getAppUrl(navigation);

  return (
    <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rulesService.polling.successText"
          defaultMessage="SIEM rules migration #{number} has finished translating. Results have been added to a dedicated page."
          values={{ number: migration.number }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButton onClick={onClick} href={url} color="success">
          {i18n.translate(
            'xpack.securitySolution.siemMigrations.rulesService.polling.successLinkText',
            { defaultMessage: 'Go to translated rules' }
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
