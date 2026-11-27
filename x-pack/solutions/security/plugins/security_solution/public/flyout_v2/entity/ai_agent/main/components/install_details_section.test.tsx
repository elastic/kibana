/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { mockAgentIdentity, mockAgentRow } from '../mocks';
import { InstallDetailsSection } from './install_details_section';
import { AI_AGENT_TEST_IDS } from '../test_ids';

describe('InstallDetailsSection', () => {
  it('is collapsed by default and shows version and first seen when opened', () => {
    render(
      <TestProviders>
        <InstallDetailsSection agent={mockAgentRow} />
      </TestProviders>
    );
    const toggle = screen.getByTestId(AI_AGENT_TEST_IDS.installDetailsToggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const section = screen.getByTestId(AI_AGENT_TEST_IDS.installDetails);
    expect(section).toHaveTextContent('Version2.1.332');
    expect(section).toHaveTextContent('First seen');
  });

  it('leaves the entity ID to the summary grid', () => {
    render(
      <TestProviders>
        <InstallDetailsSection agent={mockAgentRow} />
      </TestProviders>
    );
    const section = screen.getByTestId(AI_AGENT_TEST_IDS.installDetails);
    expect(section).not.toHaveTextContent('Entity ID');
    expect(section).not.toHaveTextContent(mockAgentIdentity.entityId);
  });

  it('shows empty values with no store row', () => {
    render(
      <TestProviders>
        <InstallDetailsSection />
      </TestProviders>
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.installDetails)).toHaveTextContent('Version—');
  });
});
