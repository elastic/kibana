/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { EnrichmentAccordion } from './threat_details_view_enrichment_accordion';
import { indicatorWithNestedObjects } from '../mocks/indicator_with_nested_objects';
import type { CtiEnrichment } from '../../../../../common/search_strategy';

describe('EnrichmentAccordion', () => {
  it('should render', () => {
    render(
      <TestProviders>
        <EnrichmentAccordion
          enrichment={indicatorWithNestedObjects as unknown as CtiEnrichment}
          index={0}
        />
      </TestProviders>
    );

    expect(true).toBeTruthy();
  });
});
