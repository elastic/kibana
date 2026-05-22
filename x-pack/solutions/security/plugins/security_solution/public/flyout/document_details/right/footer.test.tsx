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
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from '../shared/components/test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { useAlertExceptionActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { FooterAiActions } from '../../../flyout_v2/document/main/components/footer_ai_actions';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../flyout_v2/document/main/components/footer_ai_actions', () => ({
  FooterAiActions: jest.fn(() => <div data-test-subj="footerAiActions" />),
}));
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ search: '' }),
  };
});
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions');

const renderPanelFooter = (isPreview: boolean) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <PanelFooter isRulePreview={isPreview} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('PanelFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render the take action dropdown if preview mode', () => {
    const { queryByTestId } = renderPanelFooter(true);

    expect(queryByTestId(FLYOUT_FOOTER_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the take action dropdown', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        osquery: { isOsqueryAvailable: jest.fn() },
        cases: { hooks: { useIsAddToCaseOpen: jest.fn().mockReturnValue(false) } },
      },
    });
    (useAlertExceptionActions as jest.Mock).mockReturnValue({ exceptionActionItems: [] });
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineActionItems: [{ name: 'test', onClick: jest.fn() }],
    });
    (useAddToCaseActions as jest.Mock).mockReturnValue({ addToCaseActionItems: [] });

    const { getByTestId } = renderPanelFooter(false);

    expect(getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render footer AI actions with document details context data', () => {
    const { getByTestId } = renderPanelFooter(false);

    expect(getByTestId('footerAiActions')).toBeInTheDocument();
    expect(FooterAiActions).toHaveBeenCalledWith(
      expect.objectContaining({
        dataFormattedForFieldBrowser: mockContextValue.dataFormattedForFieldBrowser,
        hit: expect.objectContaining({
          raw: expect.objectContaining({
            _id: mockContextValue.searchHit._id,
            _index: mockContextValue.searchHit._index,
          }),
        }),
      }),
      {}
    );
  });
});
