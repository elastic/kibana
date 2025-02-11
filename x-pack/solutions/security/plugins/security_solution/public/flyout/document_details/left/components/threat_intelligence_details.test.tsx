/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import {
  THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID,
} from './test_ids';
import { ThreatIntelligenceDetails } from './threat_intelligence_details';
import { useThreatIntelligenceDetails } from '../hooks/use_threat_intelligence_details';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
        },
      },
    }),
  };
});

jest.mock('../hooks/use_threat_intelligence_details');

const defaultContextValue = {
  getFieldsData: () => 'id',
} as unknown as DocumentDetailsContext;

const renderThreatIntelligenceDetails = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <ThreatIntelligenceDetails />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<ThreatIntelligenceDetails />', () => {
  it('should render the view', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      isLoading: true,
      enrichments: [],
      isEventDataLoading: false,
      isEnrichmentsLoading: true,
      range: { from: '', to: '' },
      setRange: () => {},
      eventFields: {},
    });

    const { getByTestId } = renderThreatIntelligenceDetails(defaultContextValue);

    expect(getByTestId(THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID)).toBeInTheDocument();
    expect(useThreatIntelligenceDetails).toHaveBeenCalled();
  });

  it('should render loading spinner when event details are pending', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      isLoading: true,
      enrichments: [],
      isEventDataLoading: true,
      isEnrichmentsLoading: true,
      range: { from: '', to: '' },
      setRange: () => {},
      eventFields: {},
    });

    const { getByTestId } = renderThreatIntelligenceDetails(defaultContextValue);

    expect(getByTestId(THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID)).toBeInTheDocument();
    expect(useThreatIntelligenceDetails).toHaveBeenCalled();
  });

  it('should render enrichments section', () => {
    const enrichments = [
      buildEventEnrichmentMock(),
      buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
    ];

    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      isLoading: true,
      enrichments,
      isEventDataLoading: false,
      isEnrichmentsLoading: false,
      range: { from: '', to: '' },
      setRange: () => {},
      eventFields: {
        test: 'test',
      },
    });

    const { getByTestId } = renderThreatIntelligenceDetails(defaultContextValue);

    expect(getByTestId(THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID)).toBeInTheDocument();
  });
});
