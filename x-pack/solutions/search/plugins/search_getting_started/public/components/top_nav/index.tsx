/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LicenseBadge } from '@kbn/search-shared-ui';
import { useKibana } from '../../hooks/use_kibana';
import { docLinks } from '../../common/doc_links';
import { TopNavLinks } from './top_nav_links';
import { AskExpert } from './ask_expert';
import { ManageSubscription } from './manage_subscription';
import { WelcomeMessage } from './welcome';

interface TopNavLinkItem {
  buttonLabel: string;
  buttonHref: string;
  dataTestSubj: string;
  id: string;
}

export const SearchGettingStartedSectionTopNavigation = () => {
  const {
    services: { licensing },
  } = useKibana();

  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const shouldReduceLinks = useIsWithinBreakpoints(['xs', 's', 'm', 'l']);

  const topNavLinks: TopNavLinkItem[] = [
    {
      id: 'elasticCloud',
      buttonLabel: i18n.translate('xpack.search.gettingStarted.topNav.buttonLabel.cloudHome', {
        defaultMessage: 'Elastic Cloud',
      }),
      buttonHref: docLinks.cloudHome,
      dataTestSubj: 'gettingStartedCloudHome',
    },
    ...(!shouldReduceLinks
      ? [
          {
            id: 'usage',
            buttonLabel: i18n.translate('xpack.search.gettingStarted.topNav.buttonLabel.usage', {
              defaultMessage: 'Usage',
            }),
            buttonHref: docLinks.cloudUsage,
            dataTestSubj: 'gettingStartedUsage',
          },
          {
            id: 'organization',
            buttonLabel: i18n.translate(
              'xpack.search.gettingStarted.topNav.buttonLabel.organization',
              {
                defaultMessage: 'Organization',
              }
            ),
            buttonHref: docLinks.cloudOrganizationMembers,
            dataTestSubj: 'gettingStartedCloudOrganizationMembers',
          },
        ]
      : []),
  ];
  return (
    <>
      <EuiFlexGroup alignItems="baseline">
        <EuiFlexGroup alignItems="baseline">
          {!isSmallScreen && <WelcomeMessage />}
          <span>
            <LicenseBadge licensing={licensing} />
          </span>
          {!shouldReduceLinks && (
            <ManageSubscription manageSubscriptionLink={docLinks.cloudManageSubscription} />
          )}
        </EuiFlexGroup>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" alignItems="baseline">
          {!isSmallScreen && <AskExpert askExpertLink={docLinks.askAnExpert} />}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" responsive={false} alignItems="baseline">
              <EuiFlexItem grow={false}>
                <p>
                  <EuiIcon type="logoCloud" size="m" aria-hidden={true} />
                </p>
              </EuiFlexItem>
              {topNavLinks.map((link) => (
                <TopNavLinks
                  key={link.id}
                  dataTestSubj={link.dataTestSubj}
                  buttonHref={link.buttonHref}
                  buttonLabel={link.buttonLabel}
                />
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
