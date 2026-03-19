/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { InvestigationGuide } from './investigation_guide';
import {
  INVESTIGATION_GUIDE_BUTTON_TEST_ID,
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../../../flyout/document_details/shared/mocks/mock_context';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const NO_DATA_MESSAGE = "Investigation guideThere's no investigation guide for this rule.";
const PREVIEW_MESSAGE = 'Investigation guide is not available in alert preview.';

const renderInvestigationGuide = ({
  hit = buildDataTableRecord(mockContextValue.searchHit as EsHitRecord),
  isAvailable = true,
  onShowInvestigationGuide = jest.fn(),
}: {
  hit?: ReturnType<typeof buildDataTableRecord>;
  isAvailable?: boolean;
  onShowInvestigationGuide?: () => void;
} = {}) =>
  render(
    <IntlProvider locale="en">
      <InvestigationGuide
        isAvailable={isAvailable}
        hit={hit}
        onShowInvestigationGuide={onShowInvestigationGuide}
      />
    </IntlProvider>
  );

describe('<InvestigationGuide />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render investigation guide button correctly', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' },
    });
    const { getByTestId, queryByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toHaveTextContent(
      'Show investigation guide'
    );
    expect(queryByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render loading', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      rule: null,
    });
    const { getByTestId, queryByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when there is no ruleId', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' },
    });
    const hit = buildDataTableRecord({
      ...mockContextValue.searchHit,
      fields: {},
    } as unknown as EsHitRecord);
    const { queryByTestId, getByTestId } = renderInvestigationGuide({ hit });
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when there is no rule note', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: undefined },
    });
    const { getByTestId, queryByTestId } = renderInvestigationGuide();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when useRuleWithFallback errors out', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      rule: null,
    });

    const { queryByTestId, getByTestId } = renderInvestigationGuide();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render preview message when flyout is in preview', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' },
    });
    const { queryByTestId, getByTestId } = renderInvestigationGuide({ isAvailable: false });

    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });

  it('should navigate to investigation guide when clicking on button', () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' },
    });

    const onShowInvestigationGuide = jest.fn();
    const { getByTestId } = renderInvestigationGuide({ onShowInvestigationGuide });
    getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID).click();

    expect(onShowInvestigationGuide).toHaveBeenCalled();
  });
});
