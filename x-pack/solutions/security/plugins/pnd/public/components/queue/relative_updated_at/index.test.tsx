/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { RelativeUpdatedAt } from '.';

const NOW = '2026-08-27T18:00:00.000Z';
const oneHourAgo = '2026-08-27T17:00:00.000Z';

describe('RelativeUpdatedAt', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders a compact last-updated indicator', () => {
    renderWithPndProviders(<RelativeUpdatedAt updatedAt={oneHourAgo} />);

    expect(screen.getByTestId('pndQueueRelativeUpdatedAt')).toHaveTextContent('1h');
  });

  it('exposes the machine-readable timestamp on the time element', () => {
    renderWithPndProviders(<RelativeUpdatedAt updatedAt={oneHourAgo} />);

    expect(screen.getByTestId('pndQueueRelativeUpdatedAt')).toHaveAttribute('datetime', oneHourAgo);
  });

  it('names the update for a screen reader', () => {
    renderWithPndProviders(<RelativeUpdatedAt updatedAt={oneHourAgo} />);

    expect(screen.getByLabelText('Last updated 1h')).toBeInTheDocument();
  });

  it('renders nothing when the timestamp is not a date', () => {
    const { container } = renderWithPndProviders(<RelativeUpdatedAt updatedAt="not a date" />);

    expect(container).toBeEmptyDOMElement();
  });
});
