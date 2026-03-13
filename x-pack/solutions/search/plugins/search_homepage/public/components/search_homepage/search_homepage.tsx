/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useAuthenticatedUser } from '../../hooks/use_authenticated_user';
import { useGetLicenseInfo } from '../../hooks/use_get_license_info';
import { useKibana } from '../../hooks/use_kibana';
import { BasicMetricBadges } from './basic_metric_badges';
import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { LicenseBadge } from './license_badge';
import { SearchHomepageBody } from './search_homepage_body';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation, cloud },
  } = useKibana();

  const { isTrial } = useGetLicenseInfo();
  const { user } = useAuthenticatedUser();

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
              {(isTrial || (!cloud?.isServerlessEnabled && !cloud?.isCloudEnabled)) && (
                <EuiFlexItem grow={false}>
                  <LicenseBadge />
                </EuiFlexItem>
              )}
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

        <BasicMetricBadges />
      </KibanaPageTemplate.Section>
      <SearchHomepageBody />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
