/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DiscoverCellActions } from '.';

const renderDiscoverCellActions = ({
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
  value = 'my-host',
}: {
  columns?: string[];
  filter?: jest.Mock;
  onAddColumn?: jest.Mock;
  onRemoveColumn?: jest.Mock;
  value?: string | string[] | undefined;
}) => {
  const result = render(
    <IntlProvider locale="en">
      <DiscoverCellActions
        field="host.name"
        value={value}
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      >
        <button type="button">{'Value'}</button>
      </DiscoverCellActions>
    </IntlProvider>
  );

  const trigger = result.container.querySelector(
    '[data-test-subj="securitySolutionOneDiscoverCellActions"]'
  ) as HTMLElement;

  return {
    ...result,
    trigger,
  };
};

describe('DiscoverCellActions', () => {
  it('uses Discover filter callbacks for value and exists actions', () => {
    const filter = jest.fn();
    const { trigger } = renderDiscoverCellActions({ filter });

    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByLabelText('Filter for value'));

    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByLabelText('Filter out value'));

    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByLabelText('Filter for field present'));

    expect(filter).toHaveBeenNthCalledWith(1, 'host.name', 'my-host', '+');
    expect(filter).toHaveBeenNthCalledWith(2, 'host.name', 'my-host', '-');
    expect(filter).toHaveBeenNthCalledWith(3, '_exists_', 'host.name', '+');
  });

  it('toggles an existing Discover column off', () => {
    const onRemoveColumn = jest.fn();
    const { trigger } = renderDiscoverCellActions({
      columns: ['host.name'],
      onRemoveColumn,
    });

    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByLabelText('Toggle column in table'));

    expect(onRemoveColumn).toHaveBeenCalledWith('host.name');
  });

  it('toggles a missing Discover column on', () => {
    const onAddColumn = jest.fn();
    const { trigger } = renderDiscoverCellActions({
      columns: ['event.action'],
      onAddColumn,
    });

    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByLabelText('Toggle column in table'));

    expect(onAddColumn).toHaveBeenCalledWith('host.name');
  });
});
