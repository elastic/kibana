/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { DecisionRadar, decisionStateForStatus } from './decision_radar';

const wrap = (ui: React.ReactElement) => <EuiThemeProvider>{ui}</EuiThemeProvider>;

const inv = (id: string, status: string): Investigation =>
  ({ id, title: id, status } as unknown as Investigation);

describe('decisionStateForStatus', () => {
  it('maps statuses onto the four decision-states', () => {
    expect(decisionStateForStatus('open')).toBe('waiting');
    expect(decisionStateForStatus('deep-watch-complete')).toBe('waiting');
    expect(decisionStateForStatus('in-progress')).toBe('in_motion');
    expect(decisionStateForStatus('deferred')).toBe('deferred');
    expect(decisionStateForStatus('auto-resolved')).toBe('decided');
    expect(decisionStateForStatus('closed')).toBe('decided');
    expect(decisionStateForStatus(undefined)).toBe('waiting');
  });
});

describe('DecisionRadar', () => {
  const rows = [
    inv('a', 'open'),
    inv('b', 'open'),
    inv('c', 'in-progress'),
    inv('d', 'deferred'),
    inv('e', 'closed'),
  ];

  it('renders one card per decision-state with correct counts', () => {
    render(wrap(<DecisionRadar investigations={rows} selected={null} onSelect={jest.fn()} />));
    const waiting = screen.getByTestId('pndDecisionRadarCard-waiting');
    const inMotion = screen.getByTestId('pndDecisionRadarCard-in_motion');
    const deferred = screen.getByTestId('pndDecisionRadarCard-deferred');
    const decided = screen.getByTestId('pndDecisionRadarCard-decided');
    expect(waiting).toHaveTextContent('2');
    expect(inMotion).toHaveTextContent('1');
    expect(deferred).toHaveTextContent('1');
    expect(decided).toHaveTextContent('1');
  });

  it('toggles the filter on card click', () => {
    const onSelect = jest.fn();
    render(wrap(<DecisionRadar investigations={rows} selected={null} onSelect={onSelect} />));
    fireEvent.click(screen.getByTestId('pndDecisionRadarCard-waiting'));
    expect(onSelect).toHaveBeenCalledWith('waiting');
  });

  it('deselects when the already-selected card is clicked again', () => {
    const onSelect = jest.fn();
    render(wrap(<DecisionRadar investigations={rows} selected="waiting" onSelect={onSelect} />));
    fireEvent.click(screen.getByTestId('pndDecisionRadarCard-waiting'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
