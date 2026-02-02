/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AISummarySection } from './ai_summary_section';
import { useOverviewTabData } from '../hooks/use_overview_tab_data';
import { useExpandSection } from '../../shared/hooks/use_expand_section';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));

jest.mock('../hooks/use_overview_tab_data', () => ({
  useOverviewTabData: jest.fn(),
}));

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../shared/components/expandable_section', () => ({
  ExpandableSection: ({
    title,
    children,
    'data-test-subj': dataTestSubj,
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
    'data-test-subj'?: string;
  }) => (
    <section data-test-subj={dataTestSubj}>
      <div>{title}</div>
      {children}
    </section>
  ),
}));

jest.mock('../../../attack_discovery/pages/results/attack_discovery_markdown_formatter', () => ({
  AttackDiscoveryMarkdownFormatter: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}));

const mockedUseOverviewTabData = jest.mocked(useOverviewTabData);
const mockedUseExpandSection = jest.mocked(useExpandSection);

const KEY = `aisummary`;

describe('AISummarySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseExpandSection.mockReturnValue(true);

    mockedUseOverviewTabData.mockReturnValue({
      summaryMarkdown: 'SUMMARY (ANONYMIZED)',
      summaryMarkdownWithReplacements: 'SUMMARY (WITH REPLACEMENTS)',
      detailsMarkdown: 'DETAILS (ANONYMIZED)',
      detailsMarkdownWithReplacements: 'DETAILS (WITH REPLACEMENTS)',
    });
  });

  it('renders the section title, switch label, and background title', () => {
    render(<AISummarySection />);

    expect(screen.getByText('Attack Summary')).toBeInTheDocument();
    expect(screen.getByText('Show anonymized values')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();

    expect(document.querySelector(`[data-test-subj="${KEY}"]`)).toBeTruthy();
  });

  it('renders the panel wrapper', () => {
    render(<AISummarySection />);
    expect(document.querySelector('[data-test-subj="overview-tab-ai-summary-panel"]')).toBeTruthy();
  });

  it('shows non-anonymized (with replacements) markdown by default', () => {
    render(<AISummarySection />);

    const summary = document.querySelector('[data-test-subj="overview-tab-ai-summary-content"]');
    const background = document.querySelector(
      '[data-test-subj="overview-tab-ai-background-content"]'
    );

    expect(summary).toHaveTextContent('SUMMARY (WITH REPLACEMENTS)');
    expect(background).toHaveTextContent('DETAILS (WITH REPLACEMENTS)');
  });

  it('toggles to anonymized markdown when the switch is clicked', async () => {
    const user = userEvent.setup();
    render(<AISummarySection />);

    const toggle = document.querySelector(
      '[data-test-subj="overview-tab-toggle-anonymized"]'
    ) as HTMLElement;

    expect(toggle).toBeTruthy();

    // ON -> anonymized
    await user.click(toggle);

    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-summary-content"]')
    ).toHaveTextContent('SUMMARY (ANONYMIZED)');
    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-background-content"]')
    ).toHaveTextContent('DETAILS (ANONYMIZED)');

    await user.click(toggle);

    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-summary-content"]')
    ).toHaveTextContent('SUMMARY (WITH REPLACEMENTS)');
    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-background-content"]')
    ).toHaveTextContent('DETAILS (WITH REPLACEMENTS)');
  });

  it('renders the anonymized switch with the expected data-test-subj', () => {
    render(<AISummarySection />);
    expect(
      document.querySelector('[data-test-subj="overview-tab-toggle-anonymized"]')
    ).toBeTruthy();
  });
});
