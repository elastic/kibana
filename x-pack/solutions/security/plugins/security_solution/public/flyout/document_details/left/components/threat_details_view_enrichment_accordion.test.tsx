/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import {
  ENRICHMENT_ACCORDION_LINK_TEST_ID,
  EnrichmentAccordion,
  THREAT_DETAILS_ROW_FIELD_TEST_ID,
  THREAT_DETAILS_ROW_LINK_VALUE_TEST_ID,
  THREAT_DETAILS_ROW_STRING_VALUE_TEST_ID,
} from './threat_details_view_enrichment_accordion';
import { indicatorWithNestedObjects } from '../mocks/indicator_with_nested_objects';
import type { CtiEnrichment } from '../../../../../common/search_strategy';

describe('EnrichmentAccordion', () => {
  it('should render the top level accordion', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentAccordion
          enrichment={indicatorWithNestedObjects as unknown as CtiEnrichment}
          index={0}
        />
      </TestProviders>
    );

    expect(getByTestId(ENRICHMENT_ACCORDION_LINK_TEST_ID)).toBeInTheDocument();
  });

  it('should render rows with EuiLink', () => {
    const { getAllByTestId, getAllByText, getByText } = render(
      <TestProviders>
        <EnrichmentAccordion
          enrichment={indicatorWithNestedObjects as unknown as CtiEnrichment}
          index={0}
        />
      </TestProviders>
    );

    expect(getAllByTestId(THREAT_DETAILS_ROW_FIELD_TEST_ID).length).toBeGreaterThan(0);
    expect(getAllByTestId(THREAT_DETAILS_ROW_STRING_VALUE_TEST_ID).length).toBeGreaterThan(0);
    expect(getAllByTestId(THREAT_DETAILS_ROW_LINK_VALUE_TEST_ID).length).toEqual(1);

    expect(getByText('@timestamp')).toBeInTheDocument();
    expect(getAllByText('2024-02-24T17:32:37.813Z').length).toBeGreaterThan(0);

    expect(getByText('agent.name')).toBeInTheDocument();
    expect(getByText('win-10')).toBeInTheDocument();

    expect(getByText('data_stream.namespace')).toBeInTheDocument();
    expect(getByText('default')).toBeInTheDocument();

    expect(getByText('indicator.reference')).toBeInTheDocument();
    expect(getByText('indicatorReferenceValue')).toBeInTheDocument();
  });
});
