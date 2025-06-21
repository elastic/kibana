/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiHorizontalRule, EuiPageTemplate } from '@elastic/eui';
import { generateRandomIndexName } from '../utils/indices';
import { useKibana } from '../hooks/use_kibana';
import { useIndicesStatusQuery } from '../hooks/api/use_indices_status_query';
import { useUserPrivilegesQuery } from '../hooks/api/use_user_permissions';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';
import { useSearchHomePageRedirect } from '../hooks/use_search_home_page_redirect';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();
  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);
  const { data: indicesData } = useIndicesStatusQuery();

  useSearchHomePageRedirect(indicesData, userPrivileges);

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
