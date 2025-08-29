/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionChildrenProps, SuggestionType } from '@kbn/cases-plugin/public';
import React from 'react';
import { Provider } from 'react-redux';
import { SYNTHETICS_SUGGESTION_COMPONENT_ID } from '../../common/constants/cases';
import type { SyntheticsSuggestion } from '../../common/types';
import { store } from '../apps/synthetics/state';

// Use named export from the module; do not assume a default export.
// Wrap it in the Provider only once inside the lazy factory.
export const syntheticsSuggestionDefinition: SuggestionType<SyntheticsSuggestion> = {
  id: SYNTHETICS_SUGGESTION_COMPONENT_ID,
  owner: 'observability',
  children: React.lazy(() =>
    import('./suggestion_component').then(({ SyntheticsSuggestionChildren }) => {
      if (!SyntheticsSuggestionChildren) {
        throw new Error('SyntheticsSuggestionChildren export not found in suggestion_component');
      }
      const Wrapped: React.FC<SuggestionChildrenProps<SyntheticsSuggestion>> = (props) => (
        <Provider store={store}>
          <SyntheticsSuggestionChildren {...props} />
        </Provider>
      );
      return { default: Wrapped };
    })
  ),
};
