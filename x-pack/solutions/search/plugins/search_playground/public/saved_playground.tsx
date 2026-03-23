/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SearchPlaygroundPageTemplate } from './layout/page_template';
import { SavedPlayground } from './components/saved_playground/saved_playground';
import { SavedPlaygroundFormProvider } from './providers/saved_playground_provider';
import { useSavedPlaygroundParameters } from './hooks/use_saved_playground_parameters';

export const SavedPlaygroundPage = () => {
  const { playgroundId } = useSavedPlaygroundParameters();
  return (
    <SearchPlaygroundPageTemplate data-test-subj="savedPlaygroundPage">
      <SavedPlaygroundFormProvider playgroundId={playgroundId}>
        <SavedPlayground />
      </SavedPlaygroundFormProvider>
    </SearchPlaygroundPageTemplate>
  );
};
