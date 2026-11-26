/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LibrarySyncBar } from './library_sync_bar';

describe('LibrarySyncBar', () => {
  const bar = () => screen.getByTestId('bar');

  it('fills as far as the rules saved against the total', () => {
    render(<LibrarySyncBar progress={{ done: 500, total: 2000 }} data-test-subj="bar" />);

    expect(bar()).toHaveAttribute('value', '500');
    expect(bar()).toHaveAttribute('max', '2000');
  });

  it('never goes past the end', () => {
    render(<LibrarySyncBar progress={{ done: 2100, total: 2000 }} data-test-subj="bar" />);

    expect(bar()).toHaveAttribute('value', '2000');
  });

  it('slides across when the total is not known', () => {
    render(<LibrarySyncBar progress={{ done: 40 }} data-test-subj="bar" />);

    expect(bar()).not.toHaveAttribute('value');
  });

  it('slides across when there is no progress yet', () => {
    render(<LibrarySyncBar data-test-subj="bar" />);

    expect(bar()).not.toHaveAttribute('value');
  });
});
