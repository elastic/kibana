/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EnrichmentAccordionGroup } from './threat_details_view_enrichment_accordion_group';
import type { CtiEnrichment } from '../../../../../common/search_strategy';
import { TestProviders } from '../../../../common/mock';
import { indicatorWithNestedObjects } from '../mocks/indicator_with_nested_objects';
import { THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID } from './test_ids';

describe('EnrichmentAccordionGroup', () => {
  describe('with an indicator with an array of nested objects as a field value', () => {
    it('should render the indicator without those fields', () => {
      // @ts-expect-error this indicator intentionally does not conform to the CtiEnrichment type
      const enrichments = [indicatorWithNestedObjects] as CtiEnrichment[];

      const { getByTestId } = render(
        <TestProviders>
          <EnrichmentAccordionGroup enrichments={enrichments} />
        </TestProviders>
      );

      const enrichmentView = getByTestId(
        `${THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID}-0`
      );
      expect(enrichmentView).toBeInTheDocument();
      expect(enrichmentView).toHaveTextContent('ipv4-addr');
    });
  });
});
