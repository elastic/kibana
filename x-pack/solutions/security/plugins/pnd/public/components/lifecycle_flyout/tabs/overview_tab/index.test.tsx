/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { LifecycleOverviewTab } from '.';

/**
 * Every section is stubbed, because each one already owns a suite that renders it against its own
 * route. What is left for this file to prove is the only thing the composition decides: that all four
 * sections decision 1 leaves on this tab are mounted, in the order that keeps decision 1's own
 * enumeration intact, and that each is handed the discovery it was opened for.
 */
jest.mock('../../sections/summary_section', () => ({
  LifecycleSummarySection: ({ correlationId }: { correlationId: string }) => (
    <div data-test-subj="pndLifecycleSection-summary">{correlationId}</div>
  ),
}));
jest.mock('../../sections/attachments_section', () => ({
  LifecycleAttachmentsSection: ({ correlationId }: { correlationId: string }) => (
    <div data-test-subj="pndLifecycleSection-attachments">{correlationId}</div>
  ),
}));
jest.mock('../../sections/tuning_section', () => ({
  LifecycleTuningSection: ({ correlationId }: { correlationId: string }) => (
    <div data-test-subj="pndLifecycleSection-tuning">{correlationId}</div>
  ),
}));
jest.mock('../../sections/lifecycle_section', () => ({
  LifecycleStepsSection: ({ correlationId }: { correlationId: string }) => (
    <div data-test-subj="pndLifecycleSection-lifecycle">{correlationId}</div>
  ),
}));

const SECTION_IDS = ['summary', 'attachments', 'tuning', 'lifecycle'] as const;

const renderTab = (correlationId = 'ad-1') =>
  render(<LifecycleOverviewTab correlationId={correlationId} />);

describe('LifecycleOverviewTab', () => {
  it('is addressable as the Overview panel', () => {
    renderTab();

    expect(screen.getByTestId('pndLifecyclePanel-overview')).toBeInTheDocument();
  });

  it.each(SECTION_IDS)('renders the %s section', (sectionId) => {
    renderTab();

    expect(screen.getByTestId(`pndLifecycleSection-${sectionId}`)).toBeInTheDocument();
  });

  it.each(SECTION_IDS)(
    'hands the %s section the discovery the overlay was opened for',
    (sectionId) => {
      renderTab('ad-7');

      expect(screen.getByTestId(`pndLifecycleSection-${sectionId}`)).toHaveTextContent('ad-7');
    }
  );

  /**
   * Load-bearing: decision 1 enumerates the Overview tab as *"description, related items, fields
   * table, attachments"*, so the fields table leads and attachments closes the content it names. The
   * two sections the decision does not name — Review tuning and Lifecycle — follow, rather than
   * being interleaved into a list the decision spelled out.
   */
  it('orders the sections so the enumeration in decision 1 is intact and ours follows it', () => {
    const { container } = renderTab();

    expect(
      Array.from(container.querySelectorAll('[data-test-subj^="pndLifecycleSection-"]')).map(
        (section) => section.getAttribute('data-test-subj')
      )
    ).toEqual([
      'pndLifecycleSection-summary',
      'pndLifecycleSection-attachments',
      'pndLifecycleSection-tuning',
      'pndLifecycleSection-lifecycle',
    ]);
  });

  it('separates the sections, so one scroll does not read as one block', () => {
    const { container } = renderTab();

    expect(container.querySelectorAll('hr')).toHaveLength(SECTION_IDS.length - 1);
  });
});
