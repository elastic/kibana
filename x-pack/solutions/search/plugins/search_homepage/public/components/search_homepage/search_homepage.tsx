/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { useGetLicenseInfo } from '../../hooks/use_get_license_info';
import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { MetricPanels } from './metric_panels';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation, security },
  } = useKibana();
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const getUser = async () => {
      const user = await security?.authc.getCurrentUser();
      setUsername(user?.username || '');
    };
    getUser();
  }, [security]);
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
  const { isTrial } = useGetLicenseInfo();
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
            <EuiFlexGroup responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>
                    {username
                      ? i18n.translate('xpack.searchHomepage.welcome.title', {
                          defaultMessage: 'Welcome, {username}',
                          values: { username },
                        })
                      : i18n.translate('xpack.searchHomepage.welcome.title.default', {
                          defaultMessage: 'Welcome',
                        })}
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              {isTrial && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="accent">
                    {i18n.translate('xpack.searchHomepage.searchHomepagePage.p.youHaveLabel', {
                      defaultMessage: 'Trial',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="searchHomepageSearchHomepagePageManageSubscriptionLink"
                  external
                  href="#"
                  color="text"
                >
                  {i18n.translate(
                    'xpack.searchHomepage.searchHomepagePage.manageSubscriptionLinkLabel',
                    { defaultMessage: 'Manage' }
                  )}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <ConnectToElasticsearch />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  size="s"
                  iconSize="m"
                  iconType="plugs"
                  onClick={() => openWiredConnectionDetails()}
                  data-test-subj="search-homepage-context-menu-button"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.searchHomepage.searchHomepagePage.euiButtonIcon.connectionDetailsPressToLabel',
                    {
                      defaultMessage:
                        'Show connection details for connecting to the Elasticsearch API',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />

        <MetricPanels />
      </KibanaPageTemplate.Section>
      <SearchHomepageBody />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
