/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
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
import type { SiemRulesMigrationsService } from '../rule_migrations_service';

export const getSuccessToast = (
  migration: RuleMigrationStats,
  core: CoreStart,
  service: SiemRulesMigrationsService
): ToastInput => ({
  color: 'success',
  iconType: 'check',
  toastLifeTimeMs: 1000 * 60 * 30, // 30 minutes
  title: i18n.translate('xpack.securitySolution.siemMigrations.rulesService.polling.successTitle', {
    defaultMessage: 'Rules translation complete.',
  }),
  text: toMountPoint(
    <NavigationProvider core={core}>
      <SuccessToastContent migration={migration} service={service} />
    </NavigationProvider>,
    core
  ),
});

export const SuccessToastContent: React.FC<{
  migration: RuleMigrationStats;
  service: SiemRulesMigrationsService;
}> = ({ migration, service }) => {
  const { navigateTo, getAppUrl } = useNavigation();

  const navParams = useMemo(() => {
    return { deepLinkId: SecurityPageName.siemMigrationsRules, path: migration.id };
  }, [migration.id]);

  const onClick: React.MouseEventHandler = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        deepLinkId: SecurityPageName.siemMigrationsRules,
        path: migration.id,
      });
      service.removeFinishedMigrationsNotification(migration.id);
    },
    [navigateTo, migration.id, service]
  );
  const url = useMemo(() => getAppUrl(navParams), [getAppUrl, navParams]);

  return (
    <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rulesService.polling.successText"
          defaultMessage='Migration "{name}" has finished. Results have been added to the translated rules page.'
          values={{ name: migration.name }}
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
