/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { PromoBanner } from './promo_banner';

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
        <EuiFlexGroup justifyContent="spaceBetween">
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
        <EuiHorizontalRule />
      </KibanaPageTemplate.Section>
      <SearchHomepageBody />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
