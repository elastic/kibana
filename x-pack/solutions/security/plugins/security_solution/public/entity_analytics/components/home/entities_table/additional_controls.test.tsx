/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AdditionalControls } from './additional_controls';

jest.mock('./fields_selector_modal', () => ({ FieldsSelectorModal: () => null }));

const props = {
  title: 'resolved entities',
  columns: [],
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
  onResetColumns: jest.fn(),
};

const renderControls = (override: object) =>
  render(
    <I18nProvider>
      <AdditionalControls {...props} {...override} />
    </I18nProvider>
  );

const totalText = (container: HTMLElement) =>
  container.querySelector('.entityAnalyticsDataTableTotal')?.textContent;

describe('AdditionalControls', () => {
  it('shows a placeholder while the total loads', () => {
    const { container } = renderControls({ total: undefined });
    expect(container.querySelector('.entityAnalyticsDataTableTotalLoading')).toBeInTheDocument();
  });

  it('shows the short total, with its title', () => {
    expect(totalText(renderControls({ total: 1423 }).container)).toBe('1.4k resolved entities');
  });

  it('shortens how much of the total is shown when the load stops at its limit', () => {
    const { container } = renderControls({ total: 6500, shown: 1000 });
    expect(totalText(container)).toBe('Showing 1k of 6.5k resolved entities');
    expect(container.querySelector('[data-euiicon-type="info"]')).not.toBeInTheDocument();
  });

  it('shows exact numbers and an info icon when the table is limited by a tile', () => {
    const { container } = renderControls({
      total: 1423,
      shown: 1000,
      limitNote: 'The table is limited to 1,000 entities.',
    });
    expect(totalText(container)).toContain('Showing 1,000 of 1,423 resolved entities');
    expect(container.querySelector('[data-euiicon-type="info"]')).toBeInTheDocument();
  });

  it('shows no note when everything fits, even with a limit note', () => {
    const { container } = renderControls({
      total: 800,
      shown: 800,
      limitNote: 'The table is limited to 1,000 entities.',
    });
    expect(totalText(container)).toBe('800 resolved entities');
    expect(container.querySelector('[data-euiicon-type="info"]')).not.toBeInTheDocument();
  });
});
