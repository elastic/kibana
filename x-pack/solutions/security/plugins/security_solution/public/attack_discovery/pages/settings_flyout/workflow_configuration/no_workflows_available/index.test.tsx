/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { NoWorkflowsAvailable } from '.';
import { TestProviders } from '../../../../../common/mock';
import * as i18n from '../translations';

const defaultProps = {
  agentBuilderUrl: 'https://example.com/agent_builder',
};

describe('NoWorkflowsAvailable', () => {
  it('renders the empty state message', () => {
    render(
      <TestProviders>
        <NoWorkflowsAvailable {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.NO_CUSTOM_WORKFLOWS_AVAILABLE_MESSAGE)).toBeInTheDocument();
  });

  it('renders the create workflow link when agentBuilderUrl is provided', () => {
    render(
      <TestProviders>
        <NoWorkflowsAvailable {...defaultProps} />
      </TestProviders>
    );

    expect(
      screen.getByRole('link', { name: new RegExp(i18n.CREATE_A_WORKFLOW_LINK_LABEL, 'u') })
    ).toHaveAttribute('href', defaultProps.agentBuilderUrl);
  });

  it('does not render the create workflow link when agentBuilderUrl is not provided', () => {
    render(
      <TestProviders>
        <NoWorkflowsAvailable agentBuilderUrl="" />
      </TestProviders>
    );

    expect(screen.queryByRole('link', { name: i18n.CREATE_A_WORKFLOW_LINK_LABEL })).toBeNull();
  });
});
