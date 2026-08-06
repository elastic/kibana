/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { BlastRadiusEntities, MAX_VISIBLE_BLAST_RADIUS_ENTITIES } from './blast_radius_entities';
import type { BlastRadiusChip } from './blast_radius_chips';

const buildEntities = (count: number): BlastRadiusChip[] =>
  Array.from({ length: count }, (_, index) => ({
    key: `entity:${index}`,
    name: `entity-${index}`,
    count: index + 1,
  }));

const renderEntities = (selectedEntityKey?: string) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <BlastRadiusEntities
          entities={buildEntities(MAX_VISIBLE_BLAST_RADIUS_ENTITIES + 2)}
          onSelect={jest.fn()}
          selectedEntityKey={selectedEntityKey}
        />
      </EuiProvider>
    </I18nProvider>
  );

const renderState = (props: Partial<React.ComponentProps<typeof BlastRadiusEntities>>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <BlastRadiusEntities entities={[]} onSelect={jest.fn()} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('BlastRadiusEntities', () => {
  it('keeps a selected overflow chip visible after collapsing', () => {
    const selectedKey = `entity:${MAX_VISIBLE_BLAST_RADIUS_ENTITIES}`;
    renderEntities(selectedKey);

    fireEvent.click(screen.getByTestId('blast-radius-show-more'));
    expect(screen.getByRole('button', { name: /entity-10: 11/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('blast-radius-show-less'));

    const chips = screen.getAllByTestId('blast-radius-chip');
    expect(chips).toHaveLength(MAX_VISIBLE_BLAST_RADIUS_ENTITIES);
    expect(
      within(screen.getByRole('button', { name: /entity-10: 11/i })).getByText('entity-10')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entity-10: 11/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('renders nothing when there is no impact and nothing is pending', () => {
    const { container } = renderState({});

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the panel up while impacted services are still loading', () => {
    renderState({ isLoading: true });

    expect(screen.getByTestId('blast-radius-loading')).toBeInTheDocument();
  });

  it('offers a retry instead of an empty panel when the lookup failed', () => {
    const onRetry = jest.fn();
    renderState({ isError: true, onRetry });

    expect(screen.getByText('Unable to load impacted services')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('blast-radius-retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});
