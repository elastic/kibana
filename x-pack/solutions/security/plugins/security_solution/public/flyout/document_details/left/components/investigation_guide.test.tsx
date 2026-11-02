/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { InvestigationGuide } from './investigation_guide';
import { INVESTIGATION_GUIDE_LOADING_TEST_ID, INVESTIGATION_GUIDE_TEST_ID } from './test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useDocumentDetailsContext } from '../../shared/context';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';

jest.mock('../../shared/context');
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const PREVIEW_MESSAGE = 'Investigation guide is not available in alert preview.';
const NO_DATA_MESSAGE = "There's no investigation guide for this rule.";

const renderInvestigationGuide = () =>
  render(
    <IntlProvider locale="en">
      <InvestigationGuide />
    </IntlProvider>
  );

describe('<InvestigationGuide />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDocumentDetailsContext).mockReturnValue(mockContextValue);
  });

  it('should render preview message when flyout is in alert preview', () => {
    jest.mocked(useDocumentDetailsContext).mockReturnValue({
      ...mockContextValue,
      isRulePreview: true,
    });
    jest.mocked(useRuleWithFallback).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' } as never,
    } as never);

    const { getByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });

  it('should render loading', () => {
    jest.mocked(useRuleWithFallback).mockReturnValue({
      loading: true,
      error: false,
      rule: null,
    } as never);

    const { getByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render full investigation guide when a rule note exists', () => {
    jest.mocked(useRuleWithFallback).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' } as never,
    } as never);

    const { getByTestId } = renderInvestigationGuide();
    expect(getByTestId('investigation-guide-full-view')).toHaveTextContent('test note');
  });

  it('should render no data message when there is no ruleId in the document', () => {
    jest.mocked(useDocumentDetailsContext).mockReturnValue({
      ...mockContextValue,
      searchHit: {
        ...mockContextValue.searchHit,
        fields: {},
      },
    });
    jest.mocked(useRuleWithFallback).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' } as never,
    } as never);

    const { getByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when there is no rule note', () => {
    jest.mocked(useRuleWithFallback).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: undefined } as never,
    } as never);

    const { getByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });
});
