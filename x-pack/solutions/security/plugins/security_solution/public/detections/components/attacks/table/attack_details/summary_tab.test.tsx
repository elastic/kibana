/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  SummaryTab,
  SUMMARY_TAB_TEST_ID,
  SUMMARY_CONTENT_TEST_ID,
  DETAILS_TITLE_TEST_ID,
  DETAILS_CONTENT_TEST_ID,
  ATTACK_CHAIN_TITLE_TEST_ID,
  INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID,
} from './summary_tab';
import { TestProviders } from '../../../../../common/mock/test_providers';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { getTacticMetadata } from '../../../../../attack_discovery/helpers';
import { AttackDiscoveryMarkdownFormatter } from '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { AttackChain } from '../../../../../attack_discovery/pages/results/attack_discovery_panel/tabs/attack_discovery_tab/attack/attack_chain';
import { InvestigateInTimelineButton } from '../../../../../common/components/event_details/investigate_in_timeline_button';
import { buildAlertsKqlFilter } from '../../../alerts_table/actions';
import { AttackAiAssistantButton } from './attack_ai_assistant_button';

jest.mock('../../../../../common/components/event_details/investigate_in_timeline_button', () => ({
  InvestigateInTimelineButton: jest.fn(({ children, 'data-test-subj': dataTestSubj }) => (
    <div data-test-subj={dataTestSubj}>{children}</div>
  )),
}));

jest.mock('./attack_ai_assistant_button', () => ({
  AttackAiAssistantButton: jest.fn(() => (
    <div data-test-subj="mock-attack-ai-assistant-button">{'AttackAiAssistantButton'}</div>
  )),
}));

jest.mock('../../../alerts_table/actions', () => ({
  buildAlertsKqlFilter: jest.fn(),
}));

jest.mock('../../../../../attack_discovery/helpers', () => ({
  ...jest.requireActual('../../../../../attack_discovery/helpers'),
  getTacticMetadata: jest.fn(() => []),
}));

jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_panel/tabs/attack_discovery_tab/attack/attack_chain',
  () => ({
    AttackChain: jest.fn(() => <div data-test-subj="mock-attack-chain">{'AttackChain'}</div>),
  })
);

jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter',
  () => ({
    AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown, alertIds }) => (
      <div data-test-subj="mock-markdown-formatter" data-alert-ids={JSON.stringify(alertIds)}>
        {markdown}
      </div>
    )),
  })
);

jest.mock('@kbn/elastic-assistant-common', () => {
  const originalModule = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...originalModule,
    replaceAnonymizedValuesWithOriginalValues: jest.fn(
      ({ messageContent }) => `${messageContent} (replaced)`
    ),
  };
});

describe('SummaryTab', () => {
  const mockAttack = {
    summaryMarkdown: 'Summary markdown',
    detailsMarkdown: 'Details markdown',
    replacements: {},
    alertIds: [],
  } as unknown as AttackDiscoveryAlert;

  const defaultProps = {
    attack: mockAttack,
    showAnonymized: false,
  };

  const renderSummaryTab = (props = {}) =>
    render(
      <TestProviders>
        <SummaryTab {...defaultProps} {...props} />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (getTacticMetadata as jest.Mock).mockReturnValue([]);
    (buildAlertsKqlFilter as jest.Mock).mockReturnValue({ query: 'mock-query' });
  });

  it('renders the summary tab', () => {
    renderSummaryTab();

    expect(screen.getByTestId(SUMMARY_TAB_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(SUMMARY_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(DETAILS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(DETAILS_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('renders markdown with replacements when showAnonymized is false', () => {
    renderSummaryTab({ showAnonymized: false });

    expect(AttackDiscoveryMarkdownFormatter).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: 'Summary markdown (replaced)',
      }),
      {}
    );
    expect(AttackDiscoveryMarkdownFormatter).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: 'Details markdown (replaced)',
      }),
      {}
    );
  });

  it('renders raw markdown when showAnonymized is true', () => {
    renderSummaryTab({ showAnonymized: true });

    expect(AttackDiscoveryMarkdownFormatter).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: 'Summary markdown',
      }),
      {}
    );
    expect(AttackDiscoveryMarkdownFormatter).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: 'Details markdown',
      }),
      {}
    );
  });

  it('renders AttackChain when tacticMetadata is present', () => {
    (getTacticMetadata as jest.Mock).mockReturnValue(['some-tactic']);
    renderSummaryTab();

    expect(screen.getByTestId(ATTACK_CHAIN_TITLE_TEST_ID)).toBeInTheDocument();
    expect(AttackChain).toHaveBeenCalledWith(
      expect.objectContaining({
        attackTactics: mockAttack.mitreAttackTactics,
      }),
      {}
    );
  });

  it('does not render AttackChain when tacticMetadata is empty', () => {
    (getTacticMetadata as jest.Mock).mockReturnValue([]);
    renderSummaryTab();

    expect(screen.queryByTestId(ATTACK_CHAIN_TITLE_TEST_ID)).not.toBeInTheDocument();
    expect(AttackChain).not.toHaveBeenCalled();
  });

  it('renders investigate in timeline button', () => {
    mockAttack.alertIds = ['alert-1', 'alert-2'];
    mockAttack.replacements = { 'alert-1': 'original-alert-1' };
    renderSummaryTab();

    expect(buildAlertsKqlFilter).toHaveBeenCalledWith('_id', ['original-alert-1', 'alert-2']);
    expect(InvestigateInTimelineButton).toHaveBeenCalledWith(
      expect.objectContaining({
        asEmptyButton: true,
        dataProviders: null,
        filters: { query: 'mock-query' },
        flush: 'both',
        iconType: 'timeline',
        size: 'm',
      }),
      {}
    );

    expect(screen.getByTestId(INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)).toHaveTextContent(
      'Investigate in Timeline'
    );
  });

  it('renders AttackAiAssistantButton with correct props', () => {
    renderSummaryTab();

    expect(screen.getByTestId('mock-attack-ai-assistant-button')).toBeInTheDocument();
    expect(AttackAiAssistantButton).toHaveBeenCalledWith(
      expect.objectContaining({
        attack: mockAttack,
        pathway: 'attacks_page_group_summary',
      }),
      {}
    );
  });

  it('passes originalAlertIds to AttackDiscoveryMarkdownFormatter', () => {
    mockAttack.alertIds = ['alert-1', 'alert-2'];
    mockAttack.replacements = { 'alert-1': 'original-1' };
    renderSummaryTab();

    const formatters = screen.getAllByTestId('mock-markdown-formatter');
    expect(formatters.length).toBeGreaterThan(0);
    formatters.forEach((formatter) => {
      expect(formatter).toHaveAttribute(
        'data-alert-ids',
        JSON.stringify(['original-1', 'alert-2'])
      );
    });
  });
});
