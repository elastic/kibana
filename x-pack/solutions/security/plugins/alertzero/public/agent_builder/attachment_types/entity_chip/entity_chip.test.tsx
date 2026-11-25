/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntityChip } from './entity_chip';

describe('EntityChip', () => {
  it('links a host chip to the Security entity page when getUrlForApp is provided', () => {
    const getUrlForApp = jest.fn(
      (_app: string, options?: { path?: string }) => `/app/security${options?.path ?? ''}`
    );

    render(
      <EntityChip
        entity={{ field: 'host.name', value: 'WIN-ANALYST01' }}
        getUrlForApp={getUrlForApp as never}
      />
    );

    const badge = screen.getByTestId('alertzeroEntityChipLink').querySelector('.euiBadge');
    expect(badge).not.toBeNull();
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Open entity page')).toBeInTheDocument();
    expect(getUrlForApp).toHaveBeenCalledWith(
      'securitySolutionUI',
      expect.objectContaining({ path: expect.stringContaining('/name/WIN-ANALYST01') })
    );
  });

  it('falls back to the Discover action for service fields', () => {
    const getUrlForApp = jest.fn(() => '/app/security');

    render(
      <EntityChip
        entity={{ field: 'service.name', value: 'nginx' }}
        getUrlForApp={getUrlForApp as never}
      />
    );

    expect(getUrlForApp).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: expect.stringContaining('nginx') })
    );
    const badge = screen.getByTestId('alertzeroEntityChipLink').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.queryByLabelText('Open entity page')).not.toBeInTheDocument();
  });

  it('does not throw and shows no entity-page action when getUrlForApp is missing', () => {
    render(<EntityChip entity={{ field: 'host.name', value: 'WIN-ANALYST01' }} />);
    const badge = screen.getByTestId('alertzeroEntityChipLink').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.queryByLabelText('Open entity page')).not.toBeInTheDocument();
  });
});
