/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './header';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();
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
      restrictWidth={false}
      data-test-subj="search-homepage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <SearchHomepageHeader />
      <EuiHorizontalRule margin="none" />
      <SearchHomepageBody />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
