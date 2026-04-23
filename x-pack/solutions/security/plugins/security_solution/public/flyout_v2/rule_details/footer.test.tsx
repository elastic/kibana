/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Footer } from './footer';
import { useRuleDetailsLink } from './hooks/use_rule_details_link';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { TestProviders } from '../../common/mock';
import type { RuleResponse } from '../../../common/api/detection_engine';
import { RULE_DETAILS_FOOTER_TEST_ID, RULE_DETAILS_FOOTER_LINK_TEST_ID } from './test_ids';

jest.mock('./hooks/use_rule_details_link');
jest.mock('../../agent_builder/hooks/use_agent_builder_availability');

const renderFooter = () =>
  render(
    <TestProviders>
      <Footer rule={{ id: 'ruleid' } as RuleResponse} />
    </TestProviders>
  );

describe('<Footer />', () => {
  beforeEach(() => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
      isAgentBuilderEnabled: false,
    });
  });

  it('should render rule details link when href is available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { getByTestId } = renderFooter();

    expect(getByTestId(RULE_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_FOOTER_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_FOOTER_LINK_TEST_ID)).toHaveTextContent(
      'Show full rule details'
    );
  });

  it('should not render the footer when neither link nor agent chat is available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);
    const { container } = renderFooter();

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the footer when agent chat is enabled even without rule link', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
      isAgentBuilderEnabled: true,
    });
    const { getByTestId, queryByTestId } = renderFooter();

    expect(getByTestId(RULE_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RULE_DETAILS_FOOTER_LINK_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render both chat button and link when both are available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
      isAgentBuilderEnabled: true,
    });
    const { getByTestId } = renderFooter();

    expect(getByTestId(RULE_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_FOOTER_LINK_TEST_ID)).toBeInTheDocument();
  });
});
