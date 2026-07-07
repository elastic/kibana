/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { Content } from './content';
import { getStepsData } from '../../../detection_engine/common/helpers';
import {
  mockAboutStepRule,
  mockDefineStepRule,
  mockScheduleStepRule,
} from '../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import {
  RULE_DETAILS_ABOUT_HEADER_TEST_ID,
  RULE_DETAILS_ABOUT_CONTENT_TEST_ID,
  RULE_DETAILS_DEFINITION_HEADER_TEST_ID,
  RULE_DETAILS_DEFINITION_CONTENT_TEST_ID,
  RULE_DETAILS_SCHEDULE_HEADER_TEST_ID,
  RULE_DETAILS_SCHEDULE_CONTENT_TEST_ID,
  RULE_DETAILS_ACTIONS_HEADER_TEST_ID,
  RULE_DETAILS_ACTIONS_CONTENT_TEST_ID,
} from './test_ids';

const mockGetStepsData = getStepsData as jest.Mock;
jest.mock('../../../detection_engine/common/helpers');

const rule = { name: 'rule name', description: 'rule description' } as RuleResponse;

const renderContent = () =>
  render(
    <TestProviders>
      <Content rule={rule} />
    </TestProviders>
  );

describe('<Content />', () => {
  it('should render all sections including actions', () => {
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
      ruleActionsData: { actions: ['action'] },
    });

    const { getByTestId } = renderContent();

    expect(getByTestId(RULE_DETAILS_ABOUT_HEADER_TEST_ID)).toHaveTextContent('About');
    expect(getByTestId(RULE_DETAILS_ABOUT_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_DEFINITION_HEADER_TEST_ID)).toHaveTextContent('Definition');
    expect(getByTestId(RULE_DETAILS_DEFINITION_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_SCHEDULE_HEADER_TEST_ID)).toHaveTextContent('Schedule');
    expect(getByTestId(RULE_DETAILS_SCHEDULE_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_ACTIONS_HEADER_TEST_ID)).toHaveTextContent('Actions');
    expect(getByTestId(RULE_DETAILS_ACTIONS_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should not render actions section when no actions available', () => {
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
    });

    const { queryByTestId } = renderContent();

    expect(queryByTestId(RULE_DETAILS_ACTIONS_HEADER_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RULE_DETAILS_ACTIONS_CONTENT_TEST_ID)).not.toBeInTheDocument();
  });
});
