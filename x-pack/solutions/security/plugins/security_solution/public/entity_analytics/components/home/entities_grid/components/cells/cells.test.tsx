/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { TestProviders } from '../../../../../../common/mock';
import type { Row } from '../../common';
import { AlertCountCell } from './alert_count_cell';
import { AnomalyCountCell } from './anomaly_count_cell';
import { CriticalityCell } from './criticality_cell';
import { DefaultCell } from './default_cell';
import { EntityNameCell } from './entity_name_cell';
import { EntityTypeCell } from './entity_type_cell';
import { GroupSizeCell } from './group_size_cell';
import { RiskScoreChangeCell } from './risk_score_change_cell';

const renderInProviders = (cell: React.ReactElement) =>
  render(<TestProviders>{cell}</TestProviders>);

const ROW: Row = { 'entity.id': 'host:a' };

describe('DefaultCell', () => {
  it.each([
    ['a string', 'web-1', 'web-1'],
    ['an array, joined', ['a', 'b'], 'a, b'],
    ['no value', null, '—'],
  ])('renders %s', (_, value, expected) => {
    const { container } = renderInProviders(<DefaultCell value={value} />);
    expect(container.textContent).toBe(expected);
  });
});

describe('RiskScoreChangeCell', () => {
  it.each([
    ['no value', undefined],
    ['zero', 0],
  ])('renders a dash for %s', (_, value) => {
    const { container } = renderInProviders(<RiskScoreChangeCell value={value} />);
    expect(container.textContent).toBe('—');
  });

  it.each([
    ['a rise as an up arrow', 12.6, ' 13%', 'sortUp'],
    ['a drop as a down arrow, without the sign', -7.2, ' 7%', 'sortDown'],
  ])('renders %s', (_, value, text, icon) => {
    const { container } = renderInProviders(<RiskScoreChangeCell value={value} />);
    expect(container.textContent).toBe(text);
    expect(container.querySelector(`[data-euiicon-type="${icon}"]`)).toBeInTheDocument();
  });
});

describe('AlertCountCell', () => {
  const AlertCountCellWithTheme = (
    props: Omit<React.ComponentProps<typeof AlertCountCell>, 'euiTheme'>
  ) => {
    const { euiTheme } = useEuiTheme();
    return <AlertCountCell {...props} euiTheme={euiTheme} />;
  };

  it.each([
    ['no value', undefined],
    ['zero', 0],
  ])('renders a dash for %s', (_, value) => {
    const { container } = renderInProviders(<AlertCountCellWithTheme value={value} row={ROW} />);
    expect(container.textContent).toBe('—');
  });

  it('renders the count and one bar part per severity with alerts', () => {
    const row = { ...ROW, alert_critical: 2, alert_high: 0, alert_medium: 1, alert_low: 0 };
    const { container } = renderInProviders(<AlertCountCellWithTheme value={3} row={row} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-test-subj$="__part"]')).toHaveLength(2);
  });

  it('opens the alerts of the row from the count', () => {
    const onAlertCountClick = jest.fn();
    renderInProviders(
      <AlertCountCellWithTheme value={3} row={ROW} onAlertCountClick={onAlertCountClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open alerts' }));
    expect(onAlertCountClick).toHaveBeenCalledWith(ROW);
  });
});

describe('EntityTypeCell', () => {
  it.each([
    ['a known type as its label', 'host', 'Host'],
    ['an unknown type as is', 'printer', 'printer'],
    ['no value as a dash', null, '—'],
  ])('renders %s', (_, value, expected) => {
    const { container } = renderInProviders(<EntityTypeCell value={value} />);
    expect(container.textContent).toBe(expected);
  });
});

describe('CriticalityCell', () => {
  it('renders an unknown level as unassigned', () => {
    renderInProviders(<CriticalityCell value="not_a_level" />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });
});

describe('cells with a click handler', () => {
  const clickableCells = [
    [
      'EntityNameCell',
      'web-1',
      (onClick?: (row: Row) => void) => (
        <EntityNameCell value="web-1" row={ROW} onEntityNameClick={onClick} />
      ),
    ],
    [
      'GroupSizeCell',
      '3',
      (onClick?: (row: Row) => void) => (
        <GroupSizeCell value={3} row={ROW} onGroupSizeClick={onClick} />
      ),
    ],
    [
      'AnomalyCountCell',
      '4',
      (onClick?: (row: Row) => void) => (
        <AnomalyCountCell value={4} row={ROW} onAnomalyCountClick={onClick} />
      ),
    ],
  ] as const;

  it.each(clickableCells)('%s calls its handler with the row', (_, text, renderCell) => {
    const onClick = jest.fn();
    renderInProviders(renderCell(onClick));
    fireEvent.click(screen.getByRole('button', { name: text }));
    expect(onClick).toHaveBeenCalledWith(ROW);
  });

  it.each(clickableCells)('%s renders plain text without a handler', (_, text, renderCell) => {
    renderInProviders(renderCell());
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('AnomalyCountCell renders a dash for zero', () => {
    const { container } = renderInProviders(
      <AnomalyCountCell value={0} row={ROW} onAnomalyCountClick={jest.fn()} />
    );
    expect(container.textContent).toBe('—');
  });
});
