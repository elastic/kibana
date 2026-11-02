/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AttackChain } from '.';
import { getTacticMetadata } from '@kbn/elastic-assistant-common/impl/utils/attack_discovery_helpers';
import { mockAttackDiscovery } from '../../../../../../mock/mock_attack_discovery';

jest.mock('@kbn/elastic-assistant-common/impl/utils/attack_discovery_helpers', () => ({
  getTacticMetadata: jest.fn(),
}));

const mockedGetTacticMetadata = getTacticMetadata as jest.Mock;

describe('AttackChain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the expected detected tactics from attack discovery', () => {
    mockedGetTacticMetadata.mockReturnValue([{ name: 'Initial Access', detected: true, index: 0 }]);
    const tacticMetadata = getTacticMetadata(mockAttackDiscovery.mitreAttackTactics).filter(
      (tactic) => tactic.detected
    );
    expect(tacticMetadata.length).toBeGreaterThan(0);

    render(<AttackChain attackTactics={mockAttackDiscovery.mitreAttackTactics} />);

    tacticMetadata?.forEach((tactic) => {
      expect(screen.getByText(tactic.name)).toBeInTheDocument();
    });
  });

  it('renders tactics horizontally by default', () => {
    mockedGetTacticMetadata.mockReturnValue([
      { name: 'Initial Access', detected: true, index: 0 },
      { name: 'Execution', detected: false, index: 1 },
    ]);

    render(<AttackChain attackTactics={undefined} />);

    expect(screen.getByTestId('attackChain')).toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
  });

  it('renders vertical layout without scroll container when isVertical is true', () => {
    mockedGetTacticMetadata.mockReturnValue([{ name: 'Initial Access', detected: true, index: 0 }]);

    render(<AttackChain attackTactics={undefined} isVertical />);

    expect(screen.queryByTestId('attackChain')).not.toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
  });

  it('renders nothing when metadata is empty', () => {
    mockedGetTacticMetadata.mockReturnValue([]);

    const { container } = render(<AttackChain attackTactics={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
