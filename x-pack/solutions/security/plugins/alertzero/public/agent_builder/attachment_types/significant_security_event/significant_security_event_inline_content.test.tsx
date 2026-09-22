/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  SignificantSecurityEventInlineContent,
  SSE_ATTACHMENT_TEST_ID,
  SSE_ATTACHMENT_EMPTY_TEST_ID,
} from './significant_security_event_inline_content';
import type { SignificantSecurityEventAttachment } from './types';
import { buildEntityLookupEsql, buildEventLookupEsql } from '../navigation';

const buildAttachment = (
  data: SignificantSecurityEventAttachment['data']
): SignificantSecurityEventAttachment =>
  ({
    id: 'att-1',
    type: 'security.significant_security_event',
    data,
  } as SignificantSecurityEventAttachment);

const mockShare = {
  url: {
    locators: {
      get: () => ({
        getRedirectUrl: (params: { query?: { esql?: string } }) => {
          if (params.query?.esql) {
            return `https://example.test/discover?esql=${encodeURIComponent(params.query.esql)}`;
          }
          return 'https://example.test/discover?nested=1';
        },
      }),
    },
  },
} as unknown as SharePluginStart;

const defaultNavigation = {
  spaceId: 'default',
  prependPath: (path: string) => path,
};

const renderProps = (
  attachment: SignificantSecurityEventAttachment,
  navigation: typeof defaultNavigation & { share?: SharePluginStart } = defaultNavigation
) => ({
  attachment,
  navigation,
  isSidebar: false,
});

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const baseData = {
  title: 'Suspicious lateral movement',
  severity: 'high' as const,
  confidence: 0.8,
  status: 'open' as const,
  source_watch: 'watch-1',
  capability: 'lateral-movement-detector',
  run_id: 'run-1',
  security_knowledge_indicators: [
    { type: 'technique' as const, value: 'T1021', confidence: 0.9, technique_id: 'T1021' },
  ],
  report_id: 'ti-report-1',
  entities: [
    { field: 'host.name' as const, value: 'host-1' },
    { field: 'user.name' as const, value: 'user-1' },
  ],
  timeline: [{ at: '2024-01-01T00:00:00Z', what: 'RDP session opened' }],
  hypothesis_tested: 'Attacker pivoted via RDP',
  evidence_for: ['e1', 'e2'],
  evidence_against: [],
  evaluation_record_ref: 'eval-1',
};

const huntResult = {
  has_confirmed_hit: true,
  time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
  tier1: {
    status: 'environment_hits_found' as const,
    counts: { total_hits: 12, returned_hits: 12, affected_hosts: 2, affected_users: 3 },
    per_index: [
      { index: 'logs-endpoint.events.process-default', hit_count: 8, required: true },
      { index: 'logs-endpoint.events.network-default', hit_count: 4, required: false },
    ],
    resolved_iocs: [],
  },
  tier2: {
    status: 'behaviors_proposed' as const,
    behaviors: [
      {
        technique_id: 'T1021',
        tactic_ids: ['TA0008'],
        confidence: 0.75,
        rule_name: 'Lateral movement via RDP',
      },
    ],
  },
};

describe('SignificantSecurityEventInlineContent', () => {
  it('renders the empty state for malformed data', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({} as SignificantSecurityEventAttachment['data']))}
      />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders the run_id and report link, hypothesis, timeline, and entities from a valid payload', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('alertzeroSignificantSecurityEventRunId')).toHaveTextContent('run-1');
    expect(screen.getByTestId('alertzeroSignificantSecurityEventReportLink')).toHaveTextContent(
      'ti-report-1'
    );
    expect(screen.getByText('Attacker pivoted via RDP')).toBeInTheDocument();
    expect(screen.getByText('RDP session opened')).toBeInTheDocument();
    expect(screen.getByText('host-1')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
  });

  it('does not render a title/severity/status header row (moved to the attachment header)', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.queryByText('Suspicious lateral movement')).not.toBeInTheDocument();
    expect(screen.queryByText('high (0.8)')).not.toBeInTheDocument();
  });

  it('does not render the evidence/indicators summary footer', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(
      screen.queryByText('Evidence for: 2 · Evidence against: 0 · Indicators: 1')
    ).not.toBeInTheDocument();
  });

  it('renders nothing for the timeline section when there are no entries', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, timeline: [] }))}
      />
    );
    expect(
      screen.queryByTestId('alertzeroSignificantSecurityEventTimeline')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
  });

  it('renders nothing for the entities section when entities is empty', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, entities: [] }))}
      />
    );
    expect(screen.queryByText('Entities')).not.toBeInTheDocument();
  });

  it('renders entity refs as Discover links on the exact ECS field', () => {
    const entities = [
      { field: 'user.name' as const, value: 'dev-user' },
      { field: 'user.name' as const, value: 'escalated-role' },
      { field: 'host.name' as const, value: 'ci-deploy-runner-07' },
    ];
    const userEsql = buildEntityLookupEsql({ field: 'user.name', value: 'dev-user' });
    const roleEsql = buildEntityLookupEsql({ field: 'user.name', value: 'escalated-role' });
    const hostEsql = buildEntityLookupEsql({ field: 'host.name', value: 'ci-deploy-runner-07' });

    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, entities }), {
          ...defaultNavigation,
          share: mockShare,
        })}
      />
    );

    const userLink = screen.getByTestId('alertzeroSignificantSecurityEventEntity-0');
    expect(userLink).toHaveTextContent('dev-user');
    let badge = userLink.querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    let openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(screen.getByLabelText('Open in Discover'));
    expect(openWindowSpy).toHaveBeenCalledWith(
      `https://example.test/discover?esql=${encodeURIComponent(userEsql as string)}`,
      '_blank',
      'noopener,noreferrer'
    );
    openWindowSpy.mockRestore();
    fireEvent.mouseLeave(badge as Element);

    const roleLink = screen.getByTestId('alertzeroSignificantSecurityEventEntity-1');
    expect(roleLink).toHaveTextContent('escalated-role');
    badge = roleLink.querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(screen.getByLabelText('Open in Discover'));
    expect(openWindowSpy).toHaveBeenCalledWith(
      `https://example.test/discover?esql=${encodeURIComponent(roleEsql as string)}`,
      '_blank',
      'noopener,noreferrer'
    );
    openWindowSpy.mockRestore();
    fireEvent.mouseLeave(badge as Element);

    const hostLink = screen.getByTestId('alertzeroSignificantSecurityEventEntity-2');
    expect(hostLink).toHaveTextContent('ci-deploy-runner-07');
    badge = hostLink.querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(screen.getByLabelText('Open in Discover'));
    expect(openWindowSpy).toHaveBeenCalledWith(
      `https://example.test/discover?esql=${encodeURIComponent(hostEsql as string)}`,
      '_blank',
      'noopener,noreferrer'
    );
    openWindowSpy.mockRestore();
  });

  it('renders knowledge indicators grouped by type as an IocBadge in the LabeledBadgeTable', () => {
    const data = {
      ...baseData,
      security_knowledge_indicators: [
        ...baseData.security_knowledge_indicators,
        { type: 'ioc' as const, value: '203.0.113.4', ioc: { type: 'ip' as const, value: '203.0.113.4' } },
      ],
    };
    renderWithIntl(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(data))} />
    );

    expect(
      screen.getByTestId('alertzeroSignificantSecurityEventIndicator-technique-0')
    ).toHaveTextContent('T1021 (90%)');
    expect(screen.getByTestId('alertzeroSignificantSecurityEventIndicators')).toHaveTextContent(
      '203.0.113.4'
    );
    expect(
      screen.getByTestId('alertzeroSignificantSecurityEventIndicator-ioc-0')
    ).toBeInTheDocument();
  });

  it('links a technique indicator to its MITRE ATT&CK reference', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );

    const mitreBadge = screen.getByTestId('alertzeroSignificantSecurityEventIndicator-technique-0');
    expect(mitreBadge).toHaveAttribute('href', 'https://attack.mitre.org/techniques/T1021/');
    expect(mitreBadge).toHaveAttribute('target', '_blank');
  });

  it('renders nothing for indicators when the list is empty', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, security_knowledge_indicators: [] }))}
      />
    );
    expect(
      screen.queryByTestId('alertzeroSignificantSecurityEventIndicators')
    ).not.toBeInTheDocument();
  });

  it('renders a Discover link for an event when share returns a URL, inside the collapsed events accordion', async () => {
    const user = userEvent.setup();
    const event = {
      event_id: 'evt-1',
      source_index: 'logs-endpoint.events.process-default',
    };
    const expectedEsql = buildEventLookupEsql({
      index: event.source_index,
      eventId: event.event_id,
    });
    const expectedHref = `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`;

    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, events: [event] }), {
          ...defaultNavigation,
          share: mockShare,
        })}
      />
    );

    const accordionButton = screen.getByTestId('alertzeroSignificantSecurityEventEventsAccordion');
    expect(within(accordionButton).getByRole('button', { name: '1 event' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await user.click(within(accordionButton).getByRole('button', { name: '1 event' }));

    const badgeWrapper = screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-1');
    const badge = badgeWrapper.querySelector('.euiBadge');
    expect(badge).not.toBeNull();
    fireEvent.mouseEnter(badge as Element);
    const discoverAction = screen.getByLabelText('Open in Discover');
    const openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(discoverAction);
    expect(openWindowSpy).toHaveBeenCalledWith(expectedHref, '_blank', 'noopener,noreferrer');
    openWindowSpy.mockRestore();
  });

  it('renders no Discover action for an event when share is undefined', async () => {
    const user = userEvent.setup();
    const event = {
      event_id: 'evt-plain',
      source_index: 'logs-endpoint.events.process-default',
    };

    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, events: [event] }))}
      />
    );

    const accordionButton = screen.getByTestId('alertzeroSignificantSecurityEventEventsAccordion');
    await user.click(within(accordionButton).getByRole('button', { name: '1 event' }));

    const badgeWrapper = screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-plain');
    expect(badgeWrapper).toHaveTextContent('evt-plain');
    const badge = badgeWrapper.querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.queryByLabelText('Open in Discover')).not.toBeInTheDocument();
  });

  it('renders nothing for the events accordion when there are no events or alerts', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, events: [], alerts: [] }))}
      />
    );
    expect(
      screen.queryByTestId('alertzeroSignificantSecurityEventEventsAccordion')
    ).not.toBeInTheDocument();
  });

  it('renders nothing for alerts when the list is empty', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            alerts: [],
            events: [],
            timeline: [],
            evidence_for: [],
          })
        )}
      />
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders nothing for evidence sections when both are empty', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, evidence_for: [], evidence_against: [] }))}
      />
    );
    expect(screen.queryByText('Evidence for')).not.toBeInTheDocument();
    expect(screen.queryByText('Evidence against')).not.toBeInTheDocument();
  });

  it('renders the evidence for section when populated', () => {
    renderWithIntl(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.getByText('Evidence for')).toBeInTheDocument();
    expect(screen.getByText('e1')).toBeInTheDocument();
    expect(screen.getByText('e2')).toBeInTheDocument();
  });

  describe('hunt result', () => {
    it('renders nothing when hunt_result is absent', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );
      expect(screen.queryByText('Hunt result')).not.toBeInTheDocument();
    });

    it('renders total hits, affected hosts/users stats, and the time range', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByText('Hunt result')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders a distribution bar row per index with an events-across-indices summary', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByText('12 events across 2 indices')).toBeInTheDocument();
    });

    it('renders the tier2 behaviors table with technique, rule, tactics, and confidence', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByText('Lateral movement via RDP')).toBeInTheDocument();
      expect(screen.getByText('TA0008')).toBeInTheDocument();
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    });

    it('renders no tier2 table when tier2 is absent', () => {
      const { tier2, ...tier1Only } = huntResult;
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: tier1Only }))}
        />
      );
      expect(screen.queryByText('Lateral movement via RDP')).not.toBeInTheDocument();
    });
  });

  describe('timeline', () => {
    it('renders each entry as an EuiTimeline item with a formatted date/time and the what text', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );
      expect(screen.getByTestId('alertzeroSignificantSecurityEventTimeline')).toBeInTheDocument();
      expect(screen.getByText('RDP session opened')).toBeInTheDocument();
    });

    it('renders nothing (no heading) when the timeline is empty', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, timeline: [] }))}
        />
      );
      expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventTimeline')
      ).not.toBeInTheDocument();
    });
  });

  describe('events accordion', () => {
    it('is collapsed by default', () => {
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [{ event_id: 'evt-1', source_index: 'logs-endpoint.events.process-default' }],
            })
          )}
        />
      );
      const accordionButton = screen.getByTestId(
        'alertzeroSignificantSecurityEventEventsAccordion'
      );
      expect(within(accordionButton).getByRole('button', { name: '1 event' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('expands on click to reveal the events table', async () => {
      const user = userEvent.setup();
      renderWithIntl(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [{ event_id: 'evt-1', source_index: 'logs-endpoint.events.process-default' }],
            })
          )}
        />
      );

      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventEventsAccordion');
      const accordionButton = within(accordion).getByRole('button', { name: '1 event' });
      expect(accordionButton).toBeInTheDocument();
      await user.click(accordionButton);
      expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-1')
      ).toBeInTheDocument();
    });
  });
});
