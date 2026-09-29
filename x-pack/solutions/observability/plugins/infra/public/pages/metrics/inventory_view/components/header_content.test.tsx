/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { InventoryHeaderContent } from './header_content';

vi.mock('./filter_bar', () => {
  const mocked = {
    FilterBar: () => <div data-test-subj="inventoryFilterBar" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./toolbars/toolbar', () => {
  const mocked = {
    Toolbar: () => <div data-test-subj="inventoryToolbar" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./saved_views', () => {
  const mocked = {
    SavedViews: () => <div data-test-subj="inventorySavedViews" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./waffle/view_switcher', () => {
  const mocked = {
    ViewSwitcher: () => <div data-test-subj="inventoryViewSwitcher" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_waffle_options', () => {
  const mocked = {
    useWaffleOptionsContext: () => ({
      nodeType: 'host',
      view: 'map',
      changeView: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_waffle_time', () => {
  const mocked = {
    useWaffleTimeContext: () => ({
      currentTime: 0,
    }),
  };
  return { ...mocked, default: mocked };
});

describe('InventoryHeaderContent', () => {
  const testSubjectOrder = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll('[data-test-subj]')).map(
      (el) => el.getAttribute('data-test-subj') ?? ''
    );

  it('places saved views after the search strip on the first page-header row', () => {
    render(<InventoryHeaderContent />);

    const order = testSubjectOrder(screen.getByTestId('inventoryPageHeader'));

    expect(order.indexOf('inventoryFilterBar')).toBeLessThan(order.indexOf('inventorySavedViews'));
    expect(order.indexOf('inventorySavedViews')).toBeLessThan(order.indexOf('inventoryToolbar'));
  });

  it('renders legend controls before the view switcher when provided', () => {
    render(
      <InventoryHeaderContent legendControls={<div data-test-subj="inventoryLegendControls" />} />
    );

    const order = testSubjectOrder(screen.getByTestId('inventoryPageHeader'));

    expect(order.indexOf('inventoryLegendControls')).toBeGreaterThan(-1);
    expect(order.indexOf('inventoryLegendControls')).toBeLessThan(
      order.indexOf('inventoryViewSwitcher')
    );
  });

  it('omits legend controls when they are not provided', () => {
    render(<InventoryHeaderContent />);

    expect(screen.queryByTestId('inventoryLegendControls')).not.toBeInTheDocument();
    expect(screen.getByTestId('inventoryViewSwitcher')).toBeInTheDocument();
  });
});
