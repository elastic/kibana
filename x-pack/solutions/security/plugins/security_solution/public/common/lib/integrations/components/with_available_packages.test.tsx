/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import * as fleet from '@kbn/fleet-plugin/public';
import type { AvailablePackages } from './with_available_packages';
import { withAvailablePackages } from './with_available_packages';

jest.mock('@kbn/fleet-plugin/public');

const card = (id: string, type: string) => ({ id, type } as IntegrationCardItem);

const mockUseAvailablePackages = jest.fn();
jest
  .spyOn(fleet, 'AvailablePackagesHook')
  .mockImplementation(() =>
    Promise.resolve({ useAvailablePackages: mockUseAvailablePackages } as never)
  );

describe('withAvailablePackages', () => {
  const received: AvailablePackages[] = [];
  const Wrapped = withAvailablePackages<{ availablePackages: AvailablePackages }>(
    ({ availablePackages }) => {
      received.push(availablePackages);
      return <div data-test-subj="wrapped" />;
    }
  );

  beforeEach(() => {
    received.length = 0;
    jest.clearAllMocks();
  });

  it('turns on collection grouping and hides content-only packages', async () => {
    const filteredCards = [card('epr:a', 'integration'), card('epr:content', 'content')];
    mockUseAvailablePackages.mockReturnValue({ filteredCards, searchTerm: '' });

    render(<Wrapped />);

    await waitFor(() => expect(received.length).toBeGreaterThan(0));
    expect(mockUseAvailablePackages).toHaveBeenCalledWith(
      expect.objectContaining({ enableCollectionGrouping: true })
    );
    expect(received[0].filteredCards.map(({ id }) => id)).toEqual(['epr:a']);
  });

  it('keeps the filtered cards stable across renders while the other fields stay fresh', async () => {
    const filteredCards = [card('epr:a', 'integration')];
    // Like the Fleet hook: a new object on every call, with a memoized `filteredCards`.
    mockUseAvailablePackages.mockImplementation(() => ({ filteredCards, searchTerm: 'first' }));
    const { rerender } = render(<Wrapped />);
    await waitFor(() => expect(received.length).toBeGreaterThan(0));
    const first = received[received.length - 1];

    mockUseAvailablePackages.mockImplementation(() => ({ filteredCards, searchTerm: 'second' }));
    rerender(<Wrapped prereleaseIntegrationsEnabled={true} />);
    await waitFor(() => expect(received[received.length - 1].searchTerm).toBe('second'));
    const second = received[received.length - 1];

    expect(second.filteredCards).toBe(first.filteredCards);
  });
});
