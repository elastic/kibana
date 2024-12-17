/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InvestigationGuide } from './investigation_guide';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { INVESTIGATION_GUIDE_TEST_ID, INVESTIGATION_GUIDE_LOADING_TEST_ID } from './test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';

jest.mock('../../shared/hooks/use_investigation_guide');

const NO_DATA_TEXT =
  "There's no investigation guide for this rule. Edit the rule's settings(external, opens in a new tab or window) to add one.";
const PREVIEW_MESSAGE = 'Investigation guide is not available in alert preview.';

const renderInvestigationGuide = (context: DocumentDetailsContext = mockContextValue) => (
  <TestProviders>
    <DocumentDetailsContext.Provider value={context}>
      <InvestigationGuide />
    </DocumentDetailsContext.Provider>
  </TestProviders>
);

describe('<InvestigationGuide />', () => {
  it('should render investigation guide', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: 'test note',
    });

    const { queryByTestId, getByText, queryByText } = render(renderInvestigationGuide());
    expect(getByText('test note')).toBeInTheDocument();
    expect(queryByText(NO_DATA_TEXT)).not.toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: true,
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message when there is no ruleId', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: {},
      ruleNote: 'test note',
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_TEXT);
  });

  it('should render no data message when there is no rule note', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: undefined,
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_TEXT);
  });

  it('should render no data message when useInvestigationGuide errors out', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_TEXT);
  });

  it('should render preview message when flyout is in preview', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });
    const { getByTestId } = render(
      renderInvestigationGuide({ ...mockContextValue, isPreview: true })
    );
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });
});
