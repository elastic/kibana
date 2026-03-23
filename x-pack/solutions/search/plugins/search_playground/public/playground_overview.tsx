/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UnsavedFormProvider } from './providers/unsaved_form_provider';

import { Playground } from './components/playgorund';

import { usePlaygroundBreadcrumbs } from './hooks/use_playground_breadcrumbs';
import { SearchPlaygroundPageTemplate } from './layout/page_template';

export const PlaygroundOverview = () => {
  usePlaygroundBreadcrumbs();

  return (
    <SearchPlaygroundPageTemplate data-test-subj="svlPlaygroundPage">
      <UnsavedFormProvider>
        <Playground showDocs />
      </UnsavedFormProvider>
    </SearchPlaygroundPageTemplate>
  );
};
