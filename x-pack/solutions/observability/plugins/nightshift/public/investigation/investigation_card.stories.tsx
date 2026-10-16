/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { InvestigationCard } from '@kbn/agentic-investigations-plugin/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';

const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const baseInvestigation = (
  overrides: Partial<InvestigationSummary> = {}
): InvestigationSummary => ({
  id: 'inv-base',
  title: 'CDN product-asset purge emptied edge caches and dipped hit rate',
  title_pending: false,
  created_at: ago(16 * MINUTE),
  updated_at: ago(16 * MINUTE),
  agent_id: 'nightshift.investigation',
  metadata: {
    status: 'open',
    severity: 'high',
    summary:
      'Confirm whether a CDN purge, origin slowdown, or frontend asset-path change is driving the hit-rate dip, then decide on cache TTL and purge scope follow-ups',
  },
  in_progress: false,
  subjects: [
    {
      type: 'alert',
      id: 'alert-1',
      snapshot: { rule_name: 'CDN hit-rate dip' },
      created_at: ago(16 * MINUTE),
    },
  ],
  impact: {
    entities: [
      { id: 'cdn-edge', name: 'cdn-edge' },
      { id: 'frontend-web', name: 'frontend-web' },
    ],
    created_at: ago(16 * MINUTE),
  },
  pending_proposal_count: 0,
  ...overrides,
});

/** Static stand-in for Nightshift InvestigationCardActions (robot + overflow). */
const MockCardActions = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <span
        aria-hidden="true"
        css={css({
          width: '1px',
          height: euiTheme.size.base,
          background: euiTheme.colors.backgroundLightText,
          marginLeft: euiTheme.size.s,
          marginRight: euiTheme.size.xs,
        })}
      />
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Open in chat">
          <EuiButtonIcon
            size="s"
            color="text"
            iconType="productAgent"
            aria-label="Open in chat"
            onClick={(event) => event.stopPropagation()}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Open actions menu">
          <EuiButtonIcon
            size="s"
            color="text"
            iconType="boxesVertical"
            aria-label="Open actions menu"
            onClick={(event) => event.stopPropagation()}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface CardState {
  label: string;
  note?: string;
  investigation: InvestigationSummary;
  withActions?: boolean;
  isSelected?: boolean;
}

const CARD_STATES: CardState[] = [
  {
    label: 'Nightshift default',
    note: 'Home list with actions',
    investigation: baseInvestigation(),
    withActions: true,
  },
  {
    label: 'Selected',
    investigation: baseInvestigation({ id: 'inv-selected' }),
    withActions: true,
    isSelected: true,
  },
  {
    label: 'In progress',
    note: 'in_progress=true — no running dot on the card',
    investigation: baseInvestigation({
      id: 'inv-running',
      in_progress: true,
      created_at: ago(45 * SECOND),
      title: 'Checkout latency spike after deploy',
    }),
    withActions: true,
  },
  {
    label: 'Closed',
    note: 'status=closed — no Closed badge on the card',
    investigation: baseInvestigation({
      id: 'inv-closed',
      metadata: {
        status: 'closed',
        severity: 'medium',
        summary: 'Root cause confirmed; TTL raised and purge scoped to product assets.',
      },
      created_at: ago(2 * DAY),
    }),
    withActions: true,
  },
  {
    label: 'Title pending — alert subject',
    investigation: baseInvestigation({
      id: 'inv-title-alert',
      title: 'New conversation',
      title_pending: true,
      metadata: { status: 'open', severity: 'critical' },
      impact: undefined,
      pending_proposal_count: undefined,
    }),
    withActions: true,
  },
  {
    label: 'Title pending — Slack subject',
    investigation: baseInvestigation({
      id: 'inv-title-slack',
      title: 'New conversation',
      title_pending: true,
      subjects: [
        {
          type: 'slack_thread',
          id: 'team:T1/channel:C1/thread:1.0',
          summary: 'why is checkout slow?',
          slack: { channel: 'C1', thread_ts: '1.0' },
          created_at: ago(HOUR),
        },
      ],
      metadata: { status: 'open', severity: 'high' },
      impact: undefined,
    }),
    withActions: true,
  },
  {
    label: 'Title pending — no subject',
    investigation: baseInvestigation({
      id: 'inv-title-empty',
      title: 'New conversation',
      title_pending: true,
      subjects: [],
      metadata: { status: 'open' },
      impact: undefined,
    }),
    withActions: true,
  },
  {
    label: 'No summary',
    investigation: baseInvestigation({
      id: 'inv-no-summary',
      metadata: { status: 'open', severity: 'low' },
      impact: {
        entities: [{ id: 'payments', name: 'payments' }],
        created_at: ago(3 * HOUR),
      },
    }),
    withActions: true,
  },
  {
    label: 'No entities',
    investigation: baseInvestigation({
      id: 'inv-no-entities',
      impact: undefined,
      created_at: ago(5 * MINUTE),
    }),
    withActions: true,
  },
  {
    label: 'Entity overflow (+N)',
    investigation: baseInvestigation({
      id: 'inv-entities',
      impact: {
        entities: [
          { id: 'checkout', name: 'checkout' },
          { id: 'cart', name: 'cart' },
          { id: 'payments', name: 'payments' },
          { id: 'search', name: 'search' },
          { id: 'inventory', name: 'inventory' },
        ],
        created_at: ago(MINUTE),
      },
    }),
    withActions: true,
  },
  {
    label: 'Long title truncate',
    investigation: baseInvestigation({
      id: 'inv-long-title',
      title:
        'Multi-region CDN invalidation cascaded into origin pressure, elevated 5xx on the storefront, and a secondary payment-auth retry storm across checkout and wallet services',
      created_at: ago(8 * HOUR),
    }),
    withActions: true,
  },
  {
    label: 'Long summary (2-line clamp)',
    investigation: baseInvestigation({
      id: 'inv-long-summary',
      metadata: {
        status: 'open',
        severity: 'high',
        summary:
          'First confirm the purge window and whether edge POPs finished rewarming. Then check origin TTFB and asset path changes on the last deploy. Finally decide whether to raise TTL, narrow purge scope, or roll back the frontend asset rename that may be bypassing cache keys.',
      },
    }),
    withActions: true,
  },
  {
    label: 'Without actions',
    note: 'Presentational card only (e.g. brief card / onboarding)',
    investigation: baseInvestigation({
      id: 'inv-no-actions',
      created_at: ago(30 * MINUTE),
    }),
    withActions: false,
  },
  {
    label: 'Minimal',
    investigation: baseInvestigation({
      id: 'inv-minimal',
      title: 'New conversation',
      title_pending: true,
      subjects: [],
      metadata: { status: 'open' },
      impact: undefined,
      pending_proposal_count: undefined,
      created_at: ago(10 * SECOND),
    }),
    withActions: false,
  },
];

const StateCard = ({
  state,
  selectedId,
  onSelect,
}: {
  state: CardState;
  selectedId?: string;
  onSelect: (id: string) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false} css={{ width: 420, maxWidth: '100%' }}>
      <EuiText size="xs" color="subdued">
        <p css={{ marginBottom: euiTheme.size.xs }}>
          <strong>{state.label}</strong>
          {state.note ? ` — ${state.note}` : null}
        </p>
      </EuiText>
      <EuiPanel
        paddingSize="none"
        hasBorder
        hasShadow={false}
        css={css`
          box-sizing: border-box;
          overflow: hidden;
          border-radius: ${euiTheme.size.s};
        `}
      >
        <InvestigationCard
          investigation={state.investigation}
          isSelected={state.isSelected ?? selectedId === state.investigation.id}
          onClick={() => onSelect(state.investigation.id)}
          actions={state.withActions ? <MockCardActions /> : undefined}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
};

const InvestigationCardStatesGallery = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <I18nProvider>
      <div
        css={css`
          padding: ${euiTheme.size.xl};
          max-width: 1400px;
          margin: 0 auto;
          background: ${euiTheme.colors.backgroundBaseSubdued};
          min-height: 100vh;
        `}
      >
        <EuiTitle size="s">
          <h1>Investigation card states</h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            All presentational states of <code>InvestigationCard</code> as used on Nightshift
            (actions mocked). Click a card to toggle selection. Branch / worktree:{' '}
            <code>ekso-investigation-card-states</code>.
          </p>
        </EuiText>
        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h2>Stacked list (like a severity section)</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiPanel
          paddingSize="none"
          hasBorder
          hasShadow={false}
          css={css`
            box-sizing: border-box;
            max-width: 720px;
            overflow: hidden;
            border-radius: ${euiTheme.size.s};
          `}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            responsive={false}
            css={css`
              > * + * {
                border-top: ${euiTheme.border.thin};
              }
            `}
          >
            {CARD_STATES.filter((state) => state.withActions)
              .slice(0, 4)
              .map((state) => (
                <EuiFlexItem key={state.investigation.id} grow={false}>
                  <InvestigationCard
                    investigation={state.investigation}
                    isSelected={selectedId === state.investigation.id}
                    onClick={() => setSelectedId(state.investigation.id)}
                    actions={<MockCardActions />}
                  />
                </EuiFlexItem>
              ))}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="xl" />
        <EuiTitle size="xs">
          <h2>Every state</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup wrap gutterSize="l" responsive={false}>
          {CARD_STATES.map((state) => (
            <StateCard
              key={state.investigation.id}
              state={state}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </EuiFlexGroup>
      </div>
    </I18nProvider>
  );
};

const meta: Meta<typeof InvestigationCardStatesGallery> = {
  title: 'app/Nightshift/InvestigationCard',
  component: InvestigationCardStatesGallery,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof InvestigationCardStatesGallery>;

export const AllStates: Story = {};
