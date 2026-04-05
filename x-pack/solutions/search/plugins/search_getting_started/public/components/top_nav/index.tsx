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
  useCurrentEuiBreakpoint,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LicenseBadge } from '@kbn/search-shared-ui';
import { useKibana } from '../../hooks/use_kibana';
import { docLinks } from '../../common/doc_links';
import { TopNavLinks } from './top_nav_links';
import { AskExpert } from './ask_expert';
import { WelcomeMessage } from './welcome';

interface TopNavLinkItem {
  buttonLabel: string;
  buttonHref: string;
  dataTestSubj: string;
}

export const SearchGettingStartedSectionTopNavigation = () => {
  const {
    services: { licensing },
  } = useKibana();
  const currentBreakpoint = useCurrentEuiBreakpoint();
  console.log('currentBreakpoint', currentBreakpoint);
  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const shouldReduceLinks = useIsWithinBreakpoints(['xs', 's', 'm', 'l']);

  const topNavLinks: TopNavLinkItem[] = [
    {
      buttonLabel: i18n.translate('xpack.gettingStarted.topNav.buttonLabel.cloudHome', {
        defaultMessage: 'Elastic cloud',
      }),
      buttonHref: docLinks.cloudHome,
      dataTestSubj: 'gettingStartedCloudHome',
    },
    ...(!shouldReduceLinks
      ? [
          {
            buttonLabel: i18n.translate('xpack.gettingStarted.topNav.buttonLabel.usage', {
              defaultMessage: 'Usage',
            }),
            buttonHref: docLinks.cloudUsage,
            dataTestSubj: 'gettingStartedUsage',
          },
          {
            buttonLabel: i18n.translate('xpack.gettingStarted.topNav.buttonLabel.organization', {
              defaultMessage: 'Organization',
            }),
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
