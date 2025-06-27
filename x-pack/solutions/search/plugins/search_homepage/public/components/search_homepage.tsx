/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPageTemplate } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useKibana } from '../hooks/use_kibana';
import { useSearchHomePageRedirect } from '../hooks/use_search_home_page_redirect';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();

  useSearchHomePageRedirect();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="search-homepage" grow={false}>
      <SearchHomepageHeader />
      <EuiHorizontalRule margin="none" />
      <SearchHomepageBody />
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
