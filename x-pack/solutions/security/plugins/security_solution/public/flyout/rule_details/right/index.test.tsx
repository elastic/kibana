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
import { useRuleDetailsLink } from '../../document_details/shared/hooks/use_rule_details_link';
import { RulePanel } from '.';
import { getStepsData } from '../../../detections/pages/detection_engine/rules/helpers';
import { useRuleDetails } from '../hooks/use_rule_details';
import {
  mockAboutStepRule,
  mockDefineStepRule,
  mockScheduleStepRule,
} from '../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { BODY_TEST_ID, LOADING_TEST_ID } from './test_ids';
import { RULE_PREVIEW_FOOTER_TEST_ID } from '../preview/test_ids';
import type {
  FlyoutPanelProps,
  ExpandableFlyoutState,
  ExpandableFlyoutApi,
} from '@kbn/expandable-flyout';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutState,
  useExpandableFlyoutHistory,
} from '@kbn/expandable-flyout';

jest.mock('../../document_details/shared/hooks/use_rule_details_link');

const mockUseRuleDetails = useRuleDetails as jest.Mock;
jest.mock('../hooks/use_rule_details');

const mockGetStepsData = getStepsData as jest.Mock;
jest.mock('../../../detections/pages/detection_engine/rules/helpers');

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
}));

const flyoutContextValue = {
  closeLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const flyoutHistory = [{ id: 'id1', params: {} }] as unknown as FlyoutPanelProps[];

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

    const { getByTestId, queryByTestId, queryByText } = renderRulePanel();

    expect(getByTestId(BODY_TEST_ID)).toBeInTheDocument();
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
    const { queryByTestId, getByText } = renderRulePanel();

    expect(queryByTestId(BODY_TEST_ID)).not.toBeInTheDocument();
    expect(getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });

  it('should render preview footer when isPreviewMode is true', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    mockUseRuleDetails.mockReturnValue({
      rule,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});
    const { getByTestId } = renderRulePanel(true);

    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
  });
});
