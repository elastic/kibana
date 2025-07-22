/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SearchPlaygroundPageTemplate } from './layout/page_template';
import { PlaygroundsList } from './components/playgrounds_list/playgrounds_list';
import { usePlaygroundBreadcrumbs } from './hooks/use_playground_breadcrumbs';

export const PlaygroundsListPage = () => {
  usePlaygroundBreadcrumbs();
  return (
    <SearchPlaygroundPageTemplate restrictWidth data-test-subj="playgroundsListPage">
      <PlaygroundsList />
    </SearchPlaygroundPageTemplate>
  );
};
