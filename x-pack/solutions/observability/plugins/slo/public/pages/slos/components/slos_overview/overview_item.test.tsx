/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../../../utils/test_helper';
import { OverviewItem } from './overview_item';

const mockOnStateChange = jest.fn();

jest.mock('../../hooks/use_url_search_state', () => ({
  useUrlSearchState: () => ({ state: {}, onStateChange: mockOnStateChange }),
}));

const renderOverviewItem = (props: Partial<React.ComponentProps<typeof OverviewItem>> = {}) =>
  render(
    <MemoryRouter>
      <OverviewItem
        title={47}
        description="Violated"
        ariaLabel="47 violated SLOs. Filter the list by Violated status."
        titleColor="danger"
        isLoading={false}
        query="status : VIOLATED"
        {...props}
      />
    </MemoryRouter>
  );

describe('OverviewItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the stat as a button named by ariaLabel', () => {
    renderOverviewItem();

    expect(
      screen.getByRole('button', {
        name: '47 violated SLOs. Filter the list by Violated status.',
      })
    ).toBeInTheDocument();
  });

  it('is reachable with the Tab key', async () => {
    renderOverviewItem();

    await userEvent.tab();

    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('occupies a single tab stop', async () => {
    renderOverviewItem({ tooltip: 'Click to filter SLOs by Violated status.' });

    await userEvent.tab();
    await userEvent.tab();

    expect(screen.getByRole('button')).not.toHaveFocus();
  });

  it.each(['{Enter}', ' '])('applies the query filter when activated with "%s"', async (key) => {
    renderOverviewItem();

    await userEvent.tab();
    await userEvent.keyboard(key);

    expect(mockOnStateChange).toHaveBeenCalledWith({ kqlQuery: 'status : VIOLATED' });
  });

  it('calls onClick instead of filtering when one is provided', async () => {
    const onClick = jest.fn();
    renderOverviewItem({ onClick });

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockOnStateChange).not.toHaveBeenCalled();
  });

  it('reveals the tooltip on keyboard focus', async () => {
    renderOverviewItem({ tooltip: 'Click to filter SLOs by Violated status.' });

    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'Click to filter SLOs by Violated status.'
      );
    });
  });

  it('does not describe the stat with the tooltip, so it is not announced twice', async () => {
    renderOverviewItem({ tooltip: 'Click to filter SLOs by Violated status.' });

    await userEvent.tab();
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument());

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby');
  });

  it('does not render a tooltip when none is provided', async () => {
    renderOverviewItem();

    await userEvent.tab();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
