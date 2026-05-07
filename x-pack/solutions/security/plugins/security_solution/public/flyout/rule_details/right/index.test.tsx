/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../common/mock';
import { RulePanel } from '.';
import { getStepsData } from '../../../detection_engine/common/helpers';
import { useRuleDetails } from '../../../flyout_v2/rule/hooks/use_rule_details';
import {
  mockAboutStepRule,
  mockDefineStepRule,
  mockScheduleStepRule,
} from '../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { LOADING_TEST_ID } from './test_ids';
import type {
  ExpandableFlyoutApi,
  ExpandableFlyoutState,
  FlyoutPanelHistory,
} from '@kbn/expandable-flyout';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';

const mockPreviewFooter = jest.fn();
jest.mock('../preview/footer', () => ({
  PreviewFooter: (props: Record<string, unknown>) => {
    mockPreviewFooter(props);
    return <div data-test-subj="RULE_PREVIEW_FOOTER_TEST_ID" />;
  },
}));

const mockUseRuleDetails = useRuleDetails as jest.Mock;
jest.mock('../../../flyout_v2/rule/hooks/use_rule_details');

const mockGetStepsData = getStepsData as jest.Mock;
jest.mock('../../../detection_engine/common/helpers');

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
}));

const flyoutContextValue = {
  closeLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const flyoutHistory: FlyoutPanelHistory[] = [
  { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
];

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });
const rule = { name: 'rule name', description: 'rule description' } as RuleResponse;
const ERROR_MESSAGE = 'There was an error displaying data.';

const renderRulePanel = (isPreviewMode = false) =>
  render(
    <TestProviders>
      <ThemeProvider theme={mockTheme}>
        <RulePanel ruleId={'ruleId'} isPreviewMode={isPreviewMode} />
      </ThemeProvider>
    </TestProviders>
  );

describe('<RulePanel />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('should render rule details and its sub sections', () => {
    mockUseRuleDetails.mockReturnValue({
      rule,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
      ruleActionsData: { actions: ['action'] },
    });

    const { queryByTestId, queryByText } = renderRulePanel();

    expect(queryByTestId(LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
  });

  it('should render loading spinner when rule is loading', () => {
    mockUseRuleDetails.mockReturnValue({
      rule: null,
      loading: true,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});
    const { getByTestId } = renderRulePanel();

    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message when rule is null', () => {
    mockUseRuleDetails.mockReturnValue({
      rule: null,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});
    const { getByText } = renderRulePanel();

    expect(getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });

  it('should render preview footer', () => {
    mockUseRuleDetails.mockReturnValue({
      rule,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});
    const { getByTestId } = renderRulePanel(true);

    expect(getByTestId('RULE_PREVIEW_FOOTER_TEST_ID')).toBeInTheDocument();
    expect(mockPreviewFooter).toHaveBeenCalledWith(
      expect.objectContaining({ rule, isPreviewMode: true })
    );
  });
});
