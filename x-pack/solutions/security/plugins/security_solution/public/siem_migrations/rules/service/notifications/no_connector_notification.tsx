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
import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OnboardingCardId, OnboardingTopicId } from '../../../../onboarding/constants';

export const getNoConnectorToast = (core: CoreStart): ToastInput => ({
  color: 'danger',
  iconType: 'alert',
  title: i18n.translate('xpack.securitySolution.siemMigrations.rulesService.noConnector.title', {
    defaultMessage: 'No connector configured.',
  }),
  text: toMountPoint(
    <NavigationProvider core={core}>
      <NoConnectorToastContent />
    </NavigationProvider>,
    core
  ),
});

const navigation = {
  deepLinkId: SecurityPageName.landing,
  path: `${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsAiConnectors}`,
};

const NoConnectorToastContent: React.FC = () => {
  const { navigateTo, getAppUrl } = useNavigation();
  const onClick: React.MouseEventHandler = (ev) => {
    ev.preventDefault();
    navigateTo(navigation);
  };
  const url = getAppUrl(navigation);

  return (
    <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rulesService.noConnector.text"
          defaultMessage="No AI connector configured. Select an AI connector to start rule translations."
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiLink onClick={onClick} href={url}>
          {i18n.translate('xpack.securitySolution.siemMigrations.rulesService.noConnector.link', {
            defaultMessage: 'Go to connector selection',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
