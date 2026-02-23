/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { RULE_PREVIEW_FOOTER_TEST_ID, RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID } from './test_ids';
import { PreviewFooter } from './footer';
import { useRuleDetailsLink } from '../../document_details/shared/hooks/use_rule_details_link';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { TestProviders } from '../../../common/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';

jest.mock('../../document_details/shared/hooks/use_rule_details_link');
jest.mock('../../../agent_builder/hooks/use_agent_builder_availability');

const renderRulePreviewFooter = () =>
  render(
    <TestProviders>
      <PreviewFooter rule={{ id: 'ruleid' } as RuleResponse} />
    </TestProviders>
  );

describe('<RulePreviewFooter />', () => {
  beforeEach(() => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
      isAgentBuilderEnabled: false,
    });
  });

  it('should render rule details link correctly when ruleId is available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { getByTestId } = renderRulePreviewFooter();

    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toHaveTextContent(
      'Show full rule details'
    );
  });

  it('should not render the footer if rule link and agent chat are not available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);
    const { container } = renderRulePreviewFooter();
    expect(container).toBeEmptyDOMElement();
  });

  it('should render the footer when agent chat is enabled even without rule link', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
      isAgentBuilderEnabled: true,
    });
    const { getByTestId, queryByTestId } = renderRulePreviewFooter();
    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).not.toBeInTheDocument();
  });
});
