/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ColumnSelector } from './column_selector';

const COLUMNS = [
  { id: 'lcp', label: 'LCP' },
  { id: 'fcp', label: 'FCP' },
  { id: 'ttfb', label: 'TTFB' },
];

const renderSelector = (visible: string[]) => {
  const onChange = jest.fn();
  render(
    <ColumnSelector columns={COLUMNS} visibleColumns={new Set(visible)} onChange={onChange} />
  );
  return { onChange };
};

const option = (id: string) => screen.getByTestId(`digitalExperienceColumnSelectorOption-${id}`);

describe('ColumnSelector', () => {
  it('shows how many columns are visible', () => {
    renderSelector(['lcp']);

    expect(screen.getByTestId('digitalExperienceColumnSelector')).toHaveTextContent('1/3');
  });

  it('checks the visible columns', () => {
    renderSelector(['lcp']);
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));

    expect(option('lcp')).toHaveAttribute('aria-checked', 'true');
    expect(option('fcp')).toHaveAttribute('aria-checked', 'false');
  });

  it('shows a hidden column', () => {
    const { onChange } = renderSelector(['lcp']);
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));

    fireEvent.click(option('fcp'));

    expect(onChange).toHaveBeenCalledWith(['lcp', 'fcp']);
  });

  it('hides a visible column', () => {
    const { onChange } = renderSelector(['lcp', 'fcp']);
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));

    fireEvent.click(option('lcp'));

    expect(onChange).toHaveBeenCalledWith(['fcp']);
  });

  it('keeps the column id off the DOM', () => {
    renderSelector(['lcp']);
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));

    expect(option('lcp')).not.toHaveAttribute('columnid');
  });
});
