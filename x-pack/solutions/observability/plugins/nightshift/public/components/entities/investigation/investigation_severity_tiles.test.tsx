/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { InvestigationSeverityTiles } from './investigation_severity_tiles';

const renderTiles = ({ isLoading }: { isLoading: boolean }) =>
  render(
    <I18nProvider>
      <InvestigationSeverityTiles
        severityCounts={{ critical: 2, high: 1, medium: 0, low: 0 }}
        scrollableSeverities={new Set(['critical', 'high'])}
        isLoading={isLoading}
        onSeverityClick={jest.fn()}
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
});
