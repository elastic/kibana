/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Footer } from './footer';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { TestProviders } from '../../common/mock';
import type { RuleResponse } from '../../../common/api/detection_engine';
import { RULE_DETAILS_FOOTER_TEST_ID } from './test_ids';

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

  it('should not render the footer when agent chat is not available', () => {
    const { container } = renderFooter();

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the footer when agent chat is enabled', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
      isAgentBuilderEnabled: true,
    });
    const { getByTestId } = renderFooter();

    expect(getByTestId(RULE_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
  });
});
