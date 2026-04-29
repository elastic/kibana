/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  KibanaVersionBadge,
  TrialUsageBadge,
  TRIAL_USAGE_BADGE_ENABLED_ID,
} from '@kbn/search-shared-ui';
import { useAuthenticatedUser } from '../../hooks/use_authenticated_user';
import { useKibana } from '../../hooks/use_kibana';
import { BasicMetricBadges } from './basic_metric_badges';
import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { SearchHomepageBody } from './search_homepage_body';
import { docLinks } from '../../../common/doc_links';
import { useGetLicenseInfo } from '../../hooks/use_get_license_info';
import { useTrialUsageData } from '../../hooks/api/use_trial_usage_data';

export const SearchHomepagePage = () => {
  const {
    services: {
      console: consolePlugin,
      history,
      searchNavigation,
      cloud,
      kibanaVersion,
      uiSettings,
    },
  } = useKibana();

  const { user } = useAuthenticatedUser();
  const { isTrial } = useGetLicenseInfo();
  const isTrialBadgeEnabled = uiSettings.get<boolean>(TRIAL_USAGE_BADGE_ENABLED_ID, false);
  const { data: trialUsageData } = useTrialUsageData();

  const [billingUrl, setBillingUrl] = useState<string>('');
  useEffect(() => {
    cloud
      ?.getPrivilegedUrls()
      .then((urls) => {
        if (urls.billingUrl) {
          setBillingUrl(urls.billingUrl);
        }
      })
      .catch(() => {});
  }, [cloud]);

  useEffect(() => {
    if (searchNavigation) {
      searchNavigation.breadcrumbs.setSearchBreadCrumbs([
        {
          text: i18n.translate('xpack.searchHomepage.breadcrumbs.home', { defaultMessage: 'Home' }),
        },
      ]);
    }
  }, [searchNavigation]);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={true}
      data-test-subj="search-homepage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section restrictWidth={true} grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup
              responsive={false}
              alignItems="center"
              gutterSize="s"
              data-test-subj="searchHomepageHeaderLeftsideGroup"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    {user?.full_name
                      ? i18n.translate('xpack.searchHomepage.welcome.title', {
                          defaultMessage: 'Welcome, {username}',
                          values: { username: user.full_name },
                        })
                      : i18n.translate('xpack.searchHomepage.welcome.title.default', {
                          defaultMessage: 'Welcome',
                        })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TrialUsageBadge
                  billingUrl={billingUrl}
                  isServerless={cloud?.isServerlessEnabled}
                  trialDaysLeft={trialUsageData?.trialDaysLeft}
                  storageUsage={trialUsageData?.storageUsage}
                  mlNodeCount={trialUsageData?.mlNodeCount}
                  mlMemoryLimit={trialUsageData?.mlMemoryLimit}
                  llmTotalTokens={trialUsageData?.llmTotalTokens}
                  searchPowerMax={trialUsageData?.searchPowerMax}
                  searchPowerMin={trialUsageData?.searchPowerMin}
                  boostWindowHours={trialUsageData?.boostWindowHours}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <ConnectToElasticsearch />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup>
          <BasicMetricBadges />
          <EuiFlexItem grow={false}>
            <KibanaVersionBadge
              docLink={
                cloud?.isServerlessEnabled
                  ? docLinks.serverlessReleaseNotes
                  : cloud?.isCloudEnabled
                  ? docLinks.hostedCloudReleaseNotes
                  : docLinks.releaseNotes
              }
              kibanaVersion={
                !cloud?.isServerlessEnabled
                  ? `v${kibanaVersion}`
                  : i18n.translate('xpack.searchHomepage.versionLabel.changelog', {
                      defaultMessage: 'Changelog',
                    })
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
      <SearchHomepageBody />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
