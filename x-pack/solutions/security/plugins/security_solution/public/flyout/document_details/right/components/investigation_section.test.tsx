/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_TITLE_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
  INVESTIGATION_SECTION_CONTENT_TEST_ID,
  INVESTIGATION_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { DocumentDetailsContext } from '../../shared/context';
import { InvestigationSection } from './investigation_section';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useExpandSection } from '../hooks/use_expand_section';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useFetchIndex } from '../../../../common/containers/source';
import { useRuleDetails } from '../../../rule_details/hooks/use_rule_details';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useHighlightedFieldsPrivilege } from '../../shared/hooks/use_highlighted_fields_privilege';

jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../hooks/use_expand_section');
jest.mock('../../shared/hooks/use_highlighted_fields');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/containers/source');
jest.mock('../../../rule_details/hooks/use_rule_details');
jest.mock('../../shared/hooks/use_highlighted_fields_privilege');

const mockAddSuccess = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addSuccess: mockAddSuccess,
  }),
}));

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser.filter(
    (d) => d.field !== 'kibana.alert.rule.type'
  ),
};

const renderInvestigationSection = (contextValue = panelContextValue) =>
  render(
    <TestProvider>
      <DocumentDetailsContext.Provider value={contextValue}>
        <InvestigationSection />
      </DocumentDetailsContext.Provider>
    </TestProvider>
  );

describe('<InvestigationSection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useExpandSection as jest.Mock).mockReturnValue(true);
    (useHighlightedFields as jest.Mock).mockReturnValue([]);
    (useRuleWithFallback as jest.Mock).mockReturnValue({ rule: { note: 'test note' } });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useFetchIndex as jest.Mock).mockReturnValue([false, { indexPatterns: { fields: ['field'] } }]);
  });

  it('should render investigation component top level items', () => {
    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toHaveTextContent('Investigation');
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    (useExpandSection as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeVisible();
  });

  it('should render highlighted fields section without edit button when feature flag is disabled', () => {
    const { getByTestId, queryByTestId } = renderInvestigationSection();
    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render highlighted fields section with edit button when feature flag is enabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: { id: '123' } as RuleResponse,
      isExistingRule: true,
      loading: false,
    });
    (useHighlightedFieldsPrivilege as jest.Mock).mockReturnValue({
      isEditHighlightedFieldsDisabled: false,
      tooltipContent: 'tooltip content',
    });

    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render investigation guide and highlighted fields when document is signal', () => {
    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
  });

  it('should not render investigation guide when document is not signal', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
      }
    };
    const { queryByTestId } = renderInvestigationSection({
      ...panelContextValue,
      getFieldsData: mockGetFieldsData,
    });
    expect(queryByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toBeInTheDocument();
  });
});
