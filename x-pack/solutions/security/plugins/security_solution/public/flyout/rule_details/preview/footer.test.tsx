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
import { useRuleDetailsLink } from '../../../flyout_v2/rule/hooks/use_rule_details_link';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { TestProviders } from '../../../common/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';

jest.mock('../../../flyout_v2/rule/hooks/use_rule_details_link');
jest.mock('../../../agent_builder/hooks/use_agent_builder_availability');

const renderRulePreviewFooter = ({ isPreviewMode = false }: { isPreviewMode?: boolean } = {}) =>
  render(
    <TestProviders>
      <PreviewFooter rule={{ id: 'ruleid' } as RuleResponse} isPreviewMode={isPreviewMode} />
    </TestProviders>
  );

describe('<RulePreviewFooter />', () => {
  beforeEach(() => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
      isAgentBuilderEnabled: false,
    });
  });

  it('should render rule details link in preview mode when ruleId is available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { getByTestId } = renderRulePreviewFooter({ isPreviewMode: true });

    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toHaveTextContent(
      'Show full rule details'
    );
  });

  it('should not render rule details link outside preview mode', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { container } = renderRulePreviewFooter({ isPreviewMode: false });
    expect(container).toBeEmptyDOMElement();
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

  it('should render both chat and link in preview mode when both are available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
      isAgentBuilderEnabled: true,
    });
    const { getByTestId } = renderRulePreviewFooter({ isPreviewMode: true });
    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toBeInTheDocument();
  });
});
