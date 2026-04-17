/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../common/mock';
import {
  THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID,
  THREAT_INTELLIGENCE_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_MATCHES_TEST_ID,
} from './test_ids';
import { ThreatIntelligenceDetailsView } from './threat_intelligence_details_view';
import { useThreatIntelligenceDetails } from '../hooks/use_threat_intelligence_details';
import { buildEventEnrichmentMock } from '../../../../common/search_strategy/security_solution/cti/index.mock';

jest.mock('../hooks/use_threat_intelligence_details');

const mockHit: DataTableRecord = {
  id: '1',
  raw: {},
  flattened: {},
  isAnchor: false,
};

const defaultHookReturn = {
  isLoading: false,
  enrichments: [],
  isEventDataLoading: false,
  isEnrichmentsLoading: false,
  range: { from: '', to: '' },
  setRange: () => {},
  eventFields: {},
};

const renderView = () =>
  render(
    <TestProviders>
      <ThreatIntelligenceDetailsView hit={mockHit} />
    </TestProviders>
  );

describe('<ThreatIntelligenceDetailsView />', () => {
  it('renders loading spinner when event data is loading', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      ...defaultHookReturn,
      isEventDataLoading: true,
    });

    const { getByTestId, queryByTestId } = renderView();

    expect(getByTestId(THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders indicator match enrichments section', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      ...defaultHookReturn,
      enrichments: [buildEventEnrichmentMock({ 'matched.type': ['indicator_match_rule'] })],
    });

    const { getByTestId } = renderView();

    expect(getByTestId(THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID)).toBeInTheDocument();
  });

  it('renders investigation time enrichments section when eventFields is non-empty', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      ...defaultHookReturn,
      enrichments: [buildEventEnrichmentMock()],
      eventFields: { 'source.ip': '1.2.3.4' },
    });

    const { getByTestId } = renderView();

    expect(getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_TEST_ID)).toBeInTheDocument();
  });

  it('does not render investigation time enrichments section when eventFields is empty', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      ...defaultHookReturn,
      enrichments: [buildEventEnrichmentMock()],
      eventFields: {},
    });

    const { queryByTestId } = renderView();

    expect(queryByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders matches-with-no-type section when enrichments have no type', () => {
    // Omit 'matched.type' entirely so groupBy places it in the undefined bucket
    // without leaving an explicit undefined value that downstream iteration would crash on.
    const { 'matched.type': _removed, ...enrichmentWithNoType } = buildEventEnrichmentMock();
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      ...defaultHookReturn,
      enrichments: [enrichmentWithNoType as ReturnType<typeof buildEventEnrichmentMock>],
    });

    const { getByTestId } = renderView();

    expect(getByTestId(THREAT_INTELLIGENCE_MATCHES_TEST_ID)).toBeInTheDocument();
  });

  it('renders without crashing when there are no enrichments', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue(defaultHookReturn);

    const { getByTestId } = renderView();

    expect(getByTestId(THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID)).toBeInTheDocument();
  });
});
