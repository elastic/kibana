/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { InvestigationSeverityTiles } from './investigation_severity_tiles';

const renderTiles = ({
  isLoading,
  severityCounts = { critical: 2, high: 1, medium: 0, low: 0 },
  presentSeverities = new Set(['critical', 'high'] as const),
  scrollableSeverities = new Set(['critical', 'high'] as const),
  onSeverityClick = jest.fn(),
}: {
  isLoading: boolean;
  severityCounts?: { critical: number; high: number; medium: number; low: number };
  presentSeverities?: ReadonlySet<'critical' | 'high' | 'medium' | 'low'>;
  scrollableSeverities?: ReadonlySet<'critical' | 'high' | 'medium' | 'low'>;
  onSeverityClick?: jest.Mock;
}) =>
  render(
    <I18nProvider>
      <InvestigationSeverityTiles
        severityCounts={severityCounts}
        presentSeverities={presentSeverities}
        scrollableSeverities={scrollableSeverities}
        isLoading={isLoading}
        onSeverityClick={onSeverityClick}
      />
    </I18nProvider>
  );

describe('InvestigationSeverityTiles', () => {
  it('shows a loading placeholder in place of every count while loading, so none shows a stale number', () => {
    renderTiles({ isLoading: true });

    for (const severity of ['critical', 'high', 'medium', 'low']) {
      expect(screen.queryByTestId(`nightshiftSeverityTileCount-${severity}`)).toBeNull();
      expect(screen.getByTestId(`nightshiftSeverityTileLoading-${severity}`)).toBeInTheDocument();
    }
  });

  it('shows every count once loaded', () => {
    renderTiles({ isLoading: false });

    expect(screen.getByTestId('nightshiftSeverityTileCount-critical')).toHaveTextContent('2');
    expect(screen.getByTestId('nightshiftSeverityTileCount-medium')).toHaveTextContent('0');
  });

  it('keeps a filtered-to-zero tier filled when it was present before the filter', () => {
    renderTiles({
      isLoading: false,
      severityCounts: { critical: 0, high: 1, medium: 0, low: 9 },
      // Medium exists unfiltered; Critical never did. Search hid Medium's section.
      presentSeverities: new Set(['high', 'medium', 'low']),
      scrollableSeverities: new Set(['high', 'low']),
    });

    expect(screen.getByTestId('nightshiftSeverityTile-medium')).toHaveAttribute(
      'data-tile-state',
      'present'
    );
    expect(screen.getByTestId('nightshiftSeverityTile-critical')).toHaveAttribute(
      'data-tile-state',
      'muted'
    );
    expect(screen.getByTestId('nightshiftSeverityTile-high')).toHaveAttribute(
      'data-tile-state',
      'interactive'
    );
  });

  it('does not scroll from a present-but-empty tile with no section on screen', () => {
    const onSeverityClick = jest.fn();
    renderTiles({
      isLoading: false,
      severityCounts: { critical: 0, high: 1, medium: 0, low: 0 },
      presentSeverities: new Set(['high', 'medium']),
      scrollableSeverities: new Set(['high']),
      onSeverityClick,
    });

    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-medium'));
    expect(onSeverityClick).not.toHaveBeenCalled();
  });
});
