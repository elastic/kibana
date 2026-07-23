/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { PlusCountBadge } from './plus_count_badge';

const TEST_SUBJ = 'plus-count-badge';

describe('PlusCountBadge', () => {
  it('renders the +N text', () => {
    render(
      <TestProviders>
        <PlusCountBadge count={3} ariaLabel="show more" data-test-subj={TEST_SUBJ} />
      </TestProviders>
    );
    expect(screen.getByTestId(TEST_SUBJ)).toHaveTextContent('+3');
  });

  it('is a static badge (no button role) without an onClick', () => {
    render(
      <TestProviders>
        <PlusCountBadge count={2} ariaLabel="show more" data-test-subj={TEST_SUBJ} />
      </TestProviders>
    );
    expect(screen.getByTestId(TEST_SUBJ)).not.toHaveAttribute('role', 'button');
  });

  it('fires onClick when clicked', () => {
    const onClick = jest.fn();
    render(
      <TestProviders>
        <PlusCountBadge
          count={2}
          ariaLabel="show more"
          onClick={onClick}
          data-test-subj={TEST_SUBJ}
        />
      </TestProviders>
    );
    const badge = screen.getByTestId(TEST_SUBJ);
    expect(badge).toHaveAttribute('role', 'button');
    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick on Enter key', () => {
    const onClick = jest.fn();
    render(
      <TestProviders>
        <PlusCountBadge
          count={2}
          ariaLabel="show more"
          onClick={onClick}
          data-test-subj={TEST_SUBJ}
        />
      </TestProviders>
    );
    fireEvent.keyDown(screen.getByTestId(TEST_SUBJ), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
