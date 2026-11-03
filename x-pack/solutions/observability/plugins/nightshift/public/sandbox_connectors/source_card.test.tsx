/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SourceCard } from './source_card';

describe('SourceCard', () => {
  it('shows the source and runs its action', () => {
    const onClick = jest.fn();
    render(
      <SourceCard
        icon="logoGithub"
        title="GitHub"
        description="Repositories and pull requests"
        data-test-subj="card"
        action={{ label: 'Connect', icon: 'plugs', onClick }}
      />
    );

    expect(screen.getByTestId('card')).toHaveTextContent('GitHub');
    expect(screen.getByTestId('card')).toHaveTextContent('Repositories and pull requests');
    fireEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('disables the action with a reason', () => {
    render(
      <SourceCard
        icon="logoGithub"
        title="GitHub"
        action={{ label: 'Connect', icon: 'plugs', onClick: jest.fn(), disabledReason: 'Nope' }}
      />
    );

    expect(screen.getByRole('button', { name: 'Connect GitHub' })).toBeDisabled();
  });
});
