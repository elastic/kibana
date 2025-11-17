/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { PromoBanner } from './promo_banner';
import { useGetLicenseInfo } from '../../hooks/use_get_license_info';

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
  const { isTrial, daysLeft } = useGetLicenseInfo();

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={true}
      data-test-subj="search-homepage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <PromoBanner />
      <KibanaPageTemplate.Section restrictWidth={true} grow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween">
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
                      <EuiBetaBadge
                        title=""
                        color="subdued"
                        label={
                          <FormattedMessage
                            id="xpack.searchHomepage.searchHomepagePage.trialBadgeLabel"
                            defaultMessage="Trial"
                          />
                        }
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="plugs"
                  iconSide="left"
                  onClick={() => openWiredConnectionDetails()}
                  data-test-subj="search-homepage-context-menu-button"
                  color="text"
                >
                  {i18n.translate('xpack.searchHomepage.connectionDetails.buttonLabel', {
                    defaultMessage: 'Connection details',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem>
                <EuiText>
                  <p>
                    {i18n.translate('xpack.searchHomepage.searchHomepagePage.p.youHaveLabel', {
                      defaultMessage: 'You have {daysLeft} days remaining your trial.',
                      values: {
                        daysLeft,
                      },
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="none" />
      </KibanaPageTemplate.Section>
      <SearchHomepageBody />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
