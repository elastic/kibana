/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AttackChain } from '.';
import { getAttackTacticMetadata } from '@kbn/elastic-assistant-common/impl/utils/attack_discovery_helpers';

jest.mock('@kbn/elastic-assistant-common/impl/utils/attack_discovery_helpers', () => ({
  getAttackTacticMetadata: jest.fn(),
}));

const mockedGetAttackTacticMetadata = getAttackTacticMetadata as jest.Mock;

describe('AttackChain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tactics horizontally by default', () => {
    mockedGetAttackTacticMetadata.mockReturnValue([
      { name: 'Initial Access', detected: true, index: 0 },
      { name: 'Execution', detected: false, index: 1 },
    ]);

    render(<AttackChain attackTactics={undefined} />);

    expect(screen.getByTestId('attackChain')).toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
  });

  it('renders vertical layout without scroll container when isVertical is true', () => {
    mockedGetAttackTacticMetadata.mockReturnValue([
      { name: 'Initial Access', detected: true, index: 0 },
    ]);

    render(<AttackChain attackTactics={undefined} isVertical />);

    expect(screen.queryByTestId('attackChain')).not.toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
  });

  it('renders nothing when metadata is empty', () => {
    mockedGetAttackTacticMetadata.mockReturnValue([]);

    const { container } = render(<AttackChain attackTactics={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
