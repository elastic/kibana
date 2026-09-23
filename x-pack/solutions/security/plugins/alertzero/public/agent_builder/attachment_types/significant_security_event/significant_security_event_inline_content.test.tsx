/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  SignificantSecurityEventInlineContent,
  SSE_ATTACHMENT_TEST_ID,
  SSE_ATTACHMENT_EMPTY_TEST_ID,
} from './significant_security_event_inline_content';
import type { SignificantSecurityEventAttachment } from './view_model';
import { buildEntityLookupEsql, buildEventLookupEsql } from '../navigation';
import {
  buildAttachment as buildAttachmentGeneric,
  createMockShare,
  createMockNavigation,
  renderProps as renderPropsGeneric,
} from '../test_utils';

const buildAttachment = (
  data: SignificantSecurityEventAttachment['data']
): SignificantSecurityEventAttachment =>
  buildAttachmentGeneric('security.significant_security_event', data);

const mockShare = createMockShare();

const defaultNavigation = createMockNavigation();

const renderProps = (
  attachment: SignificantSecurityEventAttachment,
  navigation: typeof defaultNavigation & { share?: SharePluginStart } = defaultNavigation
) => renderPropsGeneric(attachment, navigation);

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
      {
        index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
        hit_count: 8,
        required: true,
      },
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
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({} as SignificantSecurityEventAttachment['data']))}
      />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders the run_id and report link, hypothesis, timeline, and entities from a valid payload', () => {
    renderWithI18n(
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

  it('defers the title/severity/status row to the chrome header when one is rendered', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
          }),
          { ...defaultNavigation, share: createMockShare() }
        )}
      />
    );
    expect(screen.queryByTestId('alertzeroSignificantSecurityEventHeadline')).toBeNull();
    expect(screen.queryByText('high (0.8)')).not.toBeInTheDocument();
  });

  const emptySectionCases: Array<{
    name: string;
    data: Partial<SignificantSecurityEventAttachment['data']>;
    assert: () => void;
  }> = [
    {
      name: 'timeline',
      data: { timeline: [] },
      assert: () => {
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventTimeline')
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
      },
    },
    {
      name: 'entities',
      data: { entities: [] },
      assert: () => expect(screen.queryByText('Entities')).not.toBeInTheDocument(),
    },
    {
      name: 'indicators',
      data: { security_knowledge_indicators: [] },
      assert: () =>
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventIndicators')
        ).not.toBeInTheDocument(),
    },
    {
      name: 'events accordion',
      data: { events: [], alerts: [] },
      assert: () =>
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventEventsAccordion')
        ).not.toBeInTheDocument(),
    },
    {
      name: 'alerts',
      data: { alerts: [], events: [], timeline: [], evidence_for: [] },
      assert: () => expect(screen.queryByRole('list')).not.toBeInTheDocument(),
    },
    {
      name: 'evidence',
      data: { evidence_for: [], evidence_against: [] },
      assert: () => {
        expect(screen.queryByText('Evidence for')).not.toBeInTheDocument();
        expect(screen.queryByText('Evidence against')).not.toBeInTheDocument();
      },
    },
    {
      name: 'proposal',
      data: { maps_to_proposal: {} },
      assert: () =>
        expect(screen.queryByTestId('alertzeroSignificantSecurityEventProposal')).toBeNull(),
    },
    {
      name: 'hunt_result',
      data: {},
      assert: () => expect(screen.queryByText('Hunt result')).not.toBeInTheDocument(),
    },
    {
      name: 'tier2',
      data: {
        hunt_result: (() => {
          const { tier2, ...tier1Only } = huntResult;
          return tier1Only;
        })(),
      },
      assert: () => expect(screen.queryByText('Lateral movement via RDP')).not.toBeInTheDocument(),
    },
  ];

  it.each(emptySectionCases)(
    'renders nothing for the $name section when empty',
    ({ data, assert }) => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, ...data }))}
        />
      );
      assert();
    }
  );

  it('renders entity refs as Discover links on the exact ECS field', () => {
    const entities = [
      { field: 'user.name' as const, value: 'dev-user' },
      { field: 'user.name' as const, value: 'escalated-role' },
      { field: 'host.name' as const, value: 'ci-deploy-runner-07' },
    ];
    const userEsql = buildEntityLookupEsql({ field: 'user.name', value: 'dev-user' });
    const roleEsql = buildEntityLookupEsql({ field: 'user.name', value: 'escalated-role' });
    const hostEsql = buildEntityLookupEsql({ field: 'host.name', value: 'ci-deploy-runner-07' });

    renderWithI18n(
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
        {
          type: 'ioc' as const,
          value: '203.0.113.4',
          ioc: { type: 'ip' as const, value: '203.0.113.4' },
        },
      ],
    };
    renderWithI18n(
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

  it('renders the structured ioc value, not the generic label, when they differ', () => {
    const data = {
      ...baseData,
      security_knowledge_indicators: [
        {
          type: 'ioc' as const,
          value: 'Known malicious infrastructure',
          ioc: { type: 'ip' as const, value: '203.0.113.5' },
        },
      ],
    };
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(data))} />
    );

    expect(screen.getByTestId('alertzeroSignificantSecurityEventIndicators')).toHaveTextContent(
      '203.0.113.5'
    );
    expect(screen.getByTestId('alertzeroSignificantSecurityEventIndicators')).not.toHaveTextContent(
      'Known malicious infrastructure'
    );
  });

  it('names the technique id when the label does not contain it', () => {
    // `value` is free text and need not mention the technique, but the badge links to
    // `technique_id`, so a label-only badge sends the analyst somewhere it never named.
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            security_knowledge_indicators: [
              { type: 'technique' as const, value: 'Credential abuse', technique_id: 'T1078' },
            ],
          })
        )}
      />
    );

    const badge = screen.getByTestId('alertzeroSignificantSecurityEventIndicator-technique-0');
    expect(badge).toHaveTextContent('T1078');
    expect(badge).toHaveTextContent('Credential abuse');
    expect(badge).toHaveAttribute('href', 'https://attack.mitre.org/techniques/T1078/');
  });

  it('links a technique indicator to its MITRE ATT&CK reference', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );

    const mitreBadge = screen.getByTestId('alertzeroSignificantSecurityEventIndicator-technique-0');
    expect(mitreBadge).toHaveAttribute('href', 'https://attack.mitre.org/techniques/T1021/');
    expect(mitreBadge).toHaveAttribute('target', '_blank');
  });

  it('renders a Discover link for an event when share returns a URL, inside the collapsed events accordion', async () => {
    const user = userEvent.setup();
    const event = {
      event_id: 'evt-1',
      source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
    };
    const expectedEsql = buildEventLookupEsql({
      index: event.source_index,
      eventId: event.event_id,
    });
    const expectedHref = `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`;

    renderWithI18n(
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
      source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
    };

    renderWithI18n(
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

  it('renders the evidence for section when populated', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.getByText('Evidence for')).toBeInTheDocument();
    expect(screen.getByText('e1')).toBeInTheDocument();
    expect(screen.getByText('e2')).toBeInTheDocument();
  });

  describe('hunt result', () => {
    it('renders total hits, affected hosts/users stats, and the time range', () => {
      renderWithI18n(
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
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByText('12 events across 2 indices')).toBeInTheDocument();
    });

    it('renders the tier2 behaviors table with technique, rule, tactics, and confidence', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByText('Lateral movement via RDP')).toBeInTheDocument();
      expect(screen.getByText('TA0008')).toBeInTheDocument();
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    });
  });

  describe('timeline', () => {
    it('renders each entry as an EuiTimeline item with a formatted date/time and the what text', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );
      expect(screen.getByTestId('alertzeroSignificantSecurityEventTimeline')).toBeInTheDocument();
      expect(screen.getByText('RDP session opened')).toBeInTheDocument();
    });
  });

  describe('events accordion', () => {
    it('is collapsed by default', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [
                {
                  event_id: 'evt-1',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                },
              ],
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
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [
                {
                  event_id: 'evt-1',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                },
              ],
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

  it('renders the proposal section when maps_to_proposal has fields set', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            maps_to_proposal: {
              category: 'credential_theft',
              impact: 'Attacker can pivot to additional hosts using stolen credentials.',
              confidence: 0.75,
              actionWorkflowId: 'wf-isolate-host',
              manual_remediation: ['Rotate the affected credentials', 'Isolate host-1'],
            },
          })
        )}
      />
    );
    expect(screen.getByText('credential_theft')).toBeInTheDocument();
    expect(
      screen.getByText('Attacker can pivot to additional hosts using stolen credentials.')
    ).toBeInTheDocument();
    expect(screen.getByText('wf-isolate-host', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Rotate the affected credentials')).toBeInTheDocument();
    expect(screen.getByText('Isolate host-1')).toBeInTheDocument();
  });

  it('renders a proposal carrying only actionInput', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            maps_to_proposal: { actionInput: { endpoint_ids: 'abc-123' } },
          })
        )}
      />
    );
    expect(screen.getByTestId('alertzeroSignificantSecurityEventProposal')).toBeInTheDocument();
    expect(screen.getByText('endpoint_ids: abc-123')).toBeInTheDocument();
  });

  it('renders resolved_iocs from the hunt result', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            hunt_result: {
              ...huntResult,
              tier1: {
                ...huntResult.tier1,
                resolved_iocs: [
                  { type: 'ip' as const, value: '203.0.113.5' },
                  { type: 'hash' as const, value: 'deadbeef' },
                ],
              },
            },
          })
        )}
      />
    );
    expect(
      screen.getByTestId('alertzeroSignificantSecurityEventHuntResultResolvedIocs')
    ).toBeInTheDocument();
    expect(screen.getByText('203.0.113.5')).toBeInTheDocument();
    expect(screen.getByText('deadbeef')).toBeInTheDocument();
  });

  it('distinguishes a hunt that could not run from one that ran and found nothing', () => {
    // `no_searchable_terms` and `no_environment_hits` both render as zero counts, so the
    // outcome badges are the only thing that tells an analyst which one happened.
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            hunt_result: {
              ...huntResult,
              has_confirmed_hit: false,
              tier1: {
                ...huntResult.tier1,
                status: 'no_searchable_terms' as const,
                // The schema now ties status to counts, so a hunt that found nothing must
                // carry zero counts to be a valid payload.
                counts: {
                  ...huntResult.tier1.counts,
                  total_hits: 0,
                  returned_hits: 0,
                  affected_hosts: 0,
                  affected_users: 0,
                },
              },
            },
          })
        )}
      />
    );

    const outcome = screen.getByTestId('alertzeroSignificantSecurityEventHuntResultOutcome');
    expect(outcome).toHaveTextContent('No confirmed hit');
    expect(outcome).toHaveTextContent('No searchable terms');
  });

  it('shows returned hits when the result set is a capped sample', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            hunt_result: {
              ...huntResult,
              tier1: {
                ...huntResult.tier1,
                counts: {
                  ...huntResult.tier1.counts,
                  total_hits: 10000,
                  returned_hits: 100,
                },
              },
            },
          })
        )}
      />
    );

    expect(screen.getByText('100 of 10000')).toBeInTheDocument();
    expect(screen.getByText('Hits (sampled)')).toBeInTheDocument();
  });

  describe('headline fallback when Agent Builder omits its chrome header', () => {
    it('renders title, severity, status and confidence when there is no action button', () => {
      // No events and no alerts means no Discover action, so the platform header is absent.
      renderWithI18n(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );

      const headline = screen.getByTestId('alertzeroSignificantSecurityEventHeadline');
      expect(headline).toHaveTextContent('Suspicious lateral movement');
      expect(headline).toHaveTextContent('high');
      expect(headline).toHaveTextContent('open');
      expect(headline).toHaveTextContent('80%');
    });

    it('omits the headline when an action button gives the attachment a header', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
            }),
            { ...defaultNavigation, share: createMockShare() }
          )}
        />
      );

      expect(screen.queryByTestId('alertzeroSignificantSecurityEventHeadline')).toBeNull();
    });
  });
});
