/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionType } from '@kbn/cases-plugin/public';
import React from 'react';
import { Provider } from 'react-redux';
import type { SyntheticsSuggestion } from '../../common/types';
// TODO: adjust this import to the actual store export for the synthetics plugin
import { store } from '../apps/synthetics/state';

export const syntheticsSuggestionDefinition: SuggestionType<SyntheticsSuggestion> = {
  id: 'synthetics',
  owner: 'observability',
  children: React.lazy(() =>
    import('./suggestion_component').then((m) => {
      const Inner = m.SyntheticsSuggestionChildren;
      const Wrapped: React.FC<React.ComponentProps<typeof Inner>> = (props) => (
        <Provider store={store}>
          <Inner {...props} />
        </Provider>
      );
      return { default: Wrapped };
    })
  ),
};
