/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { MiniTile } from '../types';
import { MiniTileCard } from './mini_tile_card';

const baseTile: MiniTile = {
  id: 'slack',
  title: 'Slack',
  icon: <span data-test-subj="miniTileIcon" />,
  'data-test-subj': 'mini-slack',
};

describe('MiniTileCard', () => {
  it('renders title and the host-provided icon without any context providers', () => {
    render(<MiniTileCard tile={baseTile} />);
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByTestId('miniTileIcon')).toBeInTheDocument();
    expect(screen.getByTestId('mini-slack')).toBeInTheDocument();
  });

  it('invokes the host-provided onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<MiniTileCard tile={{ ...baseTile, onClick }} />);
    await user.click(screen.getByTestId('mini-slack'));
    expect(onClick).toHaveBeenCalled();
  });
});
