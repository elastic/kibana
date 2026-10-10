/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { TestProviders } from '../../../../../common/mock';
import type { Row } from '../common';
import { renderEntityCell } from './entities_cell_renderer';

const WATCHLIST_NAMES = new Map<string, string>();

const EntityCell = ({
  columnId,
  row,
  isEnriching,
}: {
  columnId: string;
  row: Row;
  isEnriching?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return renderEntityCell(columnId, row, WATCHLIST_NAMES, euiTheme, undefined, isEnriching);
};

const renderCellText = (columnId: string, row: Row, isEnriching?: boolean): string | null =>
  render(
    <TestProviders>
      <EntityCell columnId={columnId} row={row} isEnriching={isEnriching} />
    </TestProviders>
  ).container.textContent;

describe('renderEntityCell', () => {
  it('leaves a computed cell blank while its value loads', () => {
    expect(renderCellText('alert_count', {}, true)).toBe('');
  });

  it.each([null, 0])(
    'renders a loaded empty computed value (%s) as a dash while other columns load',
    (value) => {
      expect(renderCellText('alert_count', { alert_count: value }, true)).toBe('—');
    }
  );

  it('renders a missing computed value as a dash once loading is done', () => {
    expect(renderCellText('alert_count', {}, false)).toBe('—');
  });

  it('renders a missing entity field as a dash while computed columns load', () => {
    expect(renderCellText('entity.name', {}, true)).toBe('—');
  });

  it.each([
    ['no cases', 0, '—'],
    ['the case count', 2, '2'],
  ])('renders %s in the cases column', (_, value, expected) => {
    expect(renderCellText('case_count', { case_count: value })).toBe(expected);
  });

  it('renders a column it does not know as text', () => {
    expect(renderCellText('host.os.name', { 'host.os.name': ['linux', 'macos'] })).toBe(
      'linux, macos'
    );
  });
});
