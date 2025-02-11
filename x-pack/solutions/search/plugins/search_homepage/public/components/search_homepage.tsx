/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPageTemplate } from '@elastic/eui';

import { useKibana } from '../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="search-homepage" grow={false}>
      <SearchHomepageHeader showEndpointsAPIKeys />
      <SearchHomepageBody />
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
