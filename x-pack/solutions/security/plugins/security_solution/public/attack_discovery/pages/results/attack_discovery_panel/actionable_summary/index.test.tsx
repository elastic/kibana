/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ActionableSummary } from '.';
import { TestProviders } from '../../../../../common/mock';
import { mockAttackDiscovery } from '../../../mock/mock_attack_discovery';

describe('ActionableSummary', () => {
  const mockReplacements = {
    '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
    '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
  };

  describe('when entities with replacements are provided', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );
    });

    it('renders a hostname with the expected value from replacements', () => {
      expect(screen.getAllByTestId('entityButton')[0]).toHaveTextContent('foo.hostname');
    });

    it('renders a username with the expected value from replacements', () => {
      expect(screen.getAllByTestId('entityButton')[1]).toHaveTextContent('bar.username');
    });
  });

  describe('when entities that do NOT have replacements are provided', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={{}} // <-- no replacements for the entities
          />
        </TestProviders>
      );
    });

    it('renders a hostname with with the original hostname value', () => {
      expect(screen.getAllByTestId('entityButton')[0]).toHaveTextContent(
        '5e454c38-439c-4096-8478-0a55511c76e3'
      );
    });

    it('renders a username with the original username value', () => {
      expect(screen.getAllByTestId('entityButton')[1]).toHaveTextContent(
        '3bdc7952-a334-4d95-8092-cd176546e18a'
      );
    });
  });

  describe('when showAnonymized is true', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
            showAnonymized={true} // <-- show anonymized entities
          />
        </TestProviders>
      );
    });

    it('renders a disabled badge with the original hostname value', () => {
      expect(screen.getAllByTestId('disabledActionsBadge')[0]).toHaveTextContent(
        '5e454c38-439c-4096-8478-0a55511c76e3'
      );
    });

    it('renders a disabled badge with the original username value', () => {
      expect(screen.getAllByTestId('disabledActionsBadge')[1]).toHaveTextContent(
        '3bdc7952-a334-4d95-8092-cd176546e18a'
      );
    });
  });

  describe('View in AI assistant', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );
    });

    it('renders the View in AI assistant button', () => {
      expect(screen.getByTestId('viewInAiAssistantCompact')).toBeInTheDocument();
    });
  });
});
