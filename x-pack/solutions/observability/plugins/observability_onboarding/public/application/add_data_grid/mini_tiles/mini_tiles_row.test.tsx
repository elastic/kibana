/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { MiniTile } from '../types';
import { MiniTilesRow } from './mini_tiles_row';

const tiles: MiniTile[] = [
  { id: 'slack', title: 'Slack', icon: <span />, 'data-test-subj': 'mini-slack' },
];

describe('MiniTilesRow', () => {
  it('renders the label, tiles, and the host-built browse-all slot without providers', () => {
    render(
      <MiniTilesRow
        label="More integrations"
        tiles={tiles}
        browseAllTile={<div data-test-subj="browseAllSlot" />}
      />
    );
    expect(screen.getByText('More integrations')).toBeInTheDocument();
    expect(screen.getByTestId('mini-slack')).toBeInTheDocument();
    expect(screen.getByTestId('browseAllSlot')).toBeInTheDocument();
  });
});
