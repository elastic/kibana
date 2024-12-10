/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { PanelFooter } from './footer';
import { TestProviders } from '../../../common/mock';
import { mockContextValue } from '../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../shared/context';
import { FLYOUT_FOOTER_TEST_ID } from './test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { useAlertExceptionActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions');

describe('PanelFooter', () => {
  it('should not render the take action dropdown if preview mode', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <PanelFooter isPreview={true} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(FLYOUT_FOOTER_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the take action dropdown', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        osquery: {
          isOsqueryAvailable: jest.fn(),
        },
      },
    });
    (useAlertExceptionActions as jest.Mock).mockReturnValue({ exceptionActionItems: [] });
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineActionItems: [],
    });
    (useAddToCaseActions as jest.Mock).mockReturnValue({ addToCaseActionItems: [] });

    const wrapper = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <PanelFooter isPreview={false} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(wrapper.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
  });
});
