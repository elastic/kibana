/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { RuleDetails } from '.';
import { getStepsData } from '../../detection_engine/common/helpers';
import { useRuleDetails } from './hooks/use_rule_details';
import type { RuleResponse } from '../../../common/api/detection_engine';
import { RULE_DETAILS_LOADING_TEST_ID } from './test_ids';
import { FLYOUT_ERROR_TEST_ID } from '../shared/components/test_ids';

const mockFooter = jest.fn();
jest.mock('./footer', () => ({
  Footer: (props: Record<string, unknown>) => {
    mockFooter(props);
    return <div data-test-subj="ruleDetailsFooter" />;
  },
}));

const mockUseRuleDetails = useRuleDetails as jest.Mock;
jest.mock('./hooks/use_rule_details');

const mockGetStepsData = getStepsData as jest.Mock;
jest.mock('../../detection_engine/common/helpers');

const rule = { name: 'rule name', description: 'rule description' } as RuleResponse;

const renderRuleDetails = () =>
  render(
    <TestProviders>
      <RuleDetails ruleId="ruleId" />
    </TestProviders>
  );

describe('<RuleDetails />', () => {
  it('should render rule details and its sub sections', () => {
    mockUseRuleDetails.mockReturnValue({
      rule,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({
      ruleActionsData: { actions: ['action'] },
    });

    const { queryByTestId } = renderRuleDetails();

    expect(queryByTestId(RULE_DETAILS_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(FLYOUT_ERROR_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading state', () => {
    mockUseRuleDetails.mockReturnValue({
      rule: null,
      loading: true,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});

    const { getByTestId } = renderRuleDetails();

    expect(getByTestId(RULE_DETAILS_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render error state when rule is null', () => {
    mockUseRuleDetails.mockReturnValue({
      rule: null,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});

    const { getByTestId } = renderRuleDetails();

    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toBeInTheDocument();
  });

  it('should render footer with rule', () => {
    mockUseRuleDetails.mockReturnValue({
      rule,
      loading: false,
      isExistingRule: true,
    });
    mockGetStepsData.mockReturnValue({});

    const { getByTestId } = renderRuleDetails();

    expect(getByTestId('ruleDetailsFooter')).toBeInTheDocument();
    expect(mockFooter).toHaveBeenCalledWith(expect.objectContaining({ rule }));
  });
});
