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
import { useExpandSection } from '../../../flyout_v2/shared/hooks/use_expand_section';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));

jest.mock('../hooks/use_overview_tab_data', () => ({
  useOverviewTabData: jest.fn(),
}));

jest.mock('../../../flyout_v2/shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../../flyout_v2/shared/components/expandable_section', () => ({
  ExpandableSection: ({
    title,
    children,
    extraAction,
    'data-test-subj': dataTestSubj,
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
    extraAction?: React.ReactNode;
    'data-test-subj'?: string;
  }) => (
    <section data-test-subj={dataTestSubj}>
      <div>{title}</div>
      {extraAction}
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

  it('renders the section title, settings menu, and background title', async () => {
    const user = userEvent.setup();
    render(<AISummarySection />);

    expect(screen.getByText('Attack Summary')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByTestId('overview-tab-ai-summary-settings-menu')).toBeInTheDocument();

    expect(document.querySelector(`[data-test-subj="${KEY}"]`)).toBeTruthy();

    await user.click(screen.getByTestId('overview-tab-ai-summary-settings-menu'));
    expect(screen.getByText('Show anonymized values')).toBeInTheDocument();
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
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<AISummarySection />);

    await user.click(screen.getByTestId('overview-tab-ai-summary-settings-menu'));

    const toggleSwitch = await screen.findByTestId('overview-tab-toggle-anonymized');

    // ON -> anonymized
    await user.click(toggleSwitch);

    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-summary-content"]')
    ).toHaveTextContent('SUMMARY (ANONYMIZED)');
    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-background-content"]')
    ).toHaveTextContent('DETAILS (ANONYMIZED)');

    await user.click(screen.getByTestId('overview-tab-ai-summary-settings-menu'));
    await user.click(await screen.findByTestId('overview-tab-toggle-anonymized'));

    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-summary-content"]')
    ).toHaveTextContent('SUMMARY (WITH REPLACEMENTS)');
    expect(
      document.querySelector('[data-test-subj="overview-tab-ai-background-content"]')
    ).toHaveTextContent('DETAILS (WITH REPLACEMENTS)');
  });

  it('renders the anonymized switch with the expected data-test-subj when the menu is open', async () => {
    const user = userEvent.setup();
    render(<AISummarySection />);

    await user.click(screen.getByTestId('overview-tab-ai-summary-settings-menu'));

    expect(
      document.querySelector('[data-test-subj="overview-tab-toggle-anonymized"]')
    ).toBeTruthy();
  });

  it('disables the anonymized switch when there is no anonymized markdown', async () => {
    const user = userEvent.setup();
    mockedUseOverviewTabData.mockReturnValue({
      summaryMarkdown: '',
      summaryMarkdownWithReplacements: 'SUMMARY (WITH REPLACEMENTS)',
      detailsMarkdown: '',
      detailsMarkdownWithReplacements: 'DETAILS (WITH REPLACEMENTS)',
    });

    render(<AISummarySection />);
    await user.click(screen.getByTestId('overview-tab-ai-summary-settings-menu'));

    const toggle = document.querySelector(
      '[data-test-subj="overview-tab-toggle-anonymized"]'
    ) as HTMLInputElement;

    expect(toggle).toBeTruthy();
    expect(toggle.disabled).toBe(true);
  });
});
