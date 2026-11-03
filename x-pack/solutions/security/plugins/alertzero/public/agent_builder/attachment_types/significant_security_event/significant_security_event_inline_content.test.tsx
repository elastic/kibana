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
  hypothesis_tested: 'Attacker pivoted via RDP',
  evidence_for: ['e1', 'e2'],
  evidence_against: [],
  evaluation_record_ref: 'eval-1',
};

const huntResult = {
  has_confirmed_hit: true,
  // Tier 1 alone: the schema only accepts `tier2` here when a behavior carries
  // `execution.hit`, and these behaviors are proposals that never executed.
  hit_sources: ['tier1' as const],
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
      {
        index: 'logs-endpoint.events.network-default',
        hit_count: 4,
        required: false,
      },
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
        title: 'Lateral movement via RDP',
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

  it('renders the run_id and report link, hypothesis, and entities from a valid payload', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('alertzeroSignificantSecurityEventRunId')).toHaveTextContent('run-1');
    expect(screen.getByTestId('alertzeroSignificantSecurityEventReportLink')).toHaveTextContent(
      'ti-report-1'
    );
    expect(screen.getByText('Attacker pivoted via RDP')).toBeInTheDocument();
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
      name: 'cited evidence accordion',
      data: { events: [], alerts: [] },
      assert: () =>
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventCitedEvidence')
        ).not.toBeInTheDocument(),
    },
    {
      name: 'alerts',
      data: { alerts: [], events: [], evidence_for: [] },
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
      name: 'hunt_result',
      data: {},
      assert: () => {
        expect(screen.queryByTestId('alertzeroSignificantSecurityEventHuntWindow')).toBeNull();
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventBehaviorValidation')
        ).toBeNull();
      },
    },
    {
      name: 'tier2',
      data: {
        hunt_result: (() => {
          const { tier2, ...tier1Only } = huntResult;
          return tier1Only;
        })(),
      },
      assert: () =>
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventBehaviorValidation')
        ).not.toBeInTheDocument(),
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

  it('renders a Discover link for an event when share returns a URL, inside the collapsed cited evidence accordion', async () => {
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

    const accordionButton = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
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

    const accordionButton = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
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

  it('reveals the evidence past the visible limit on request', async () => {
    // The schema accepts 50 items a side, and the hidden ones are the hunt's own reasoning.
    const user = userEvent.setup();
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            evidence_for: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
          })
        )}
      />
    );

    expect(screen.queryByText('e6')).not.toBeInTheDocument();
    const overflow = screen.getByTestId('alertzeroSignificantSecurityEventEvidenceOverflow');
    expect(overflow).toHaveTextContent('+2 more');

    await user.click(overflow);
    expect(screen.getByText('e6')).toBeInTheDocument();
    expect(screen.getByText('e7')).toBeInTheDocument();
    expect(overflow).toHaveTextContent('Show fewer');

    await user.click(overflow);
    expect(screen.queryByText('e6')).not.toBeInTheDocument();
  });

  describe('hunt result', () => {
    it('renders environment hits, affected hosts/users stats, and the hunt window', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByTestId('alertzeroSignificantSecurityEventHuntWindow')).toHaveTextContent(
        '2024'
      );
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

    it('names the tier that confirmed the finding alongside the report-wide tier statuses', () => {
      // The worst case the statuses alone cannot express: the report's Tier 1 found hits,
      // but this finding was corroborated by Tier 2. Without the sources, "Tier 1
      // Environment hits found" reads as this finding's confirmation.
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                hit_sources: ['tier2' as const],
                tier2: {
                  status: 'behaviors_proposed' as const,
                  behaviors: [
                    {
                      ...huntResult.tier2.behaviors[0],
                      execution: { executed: true, row_count: 2, hit: true },
                    },
                  ],
                },
              },
            })
          )}
        />
      );

      const outcome = screen.getByTestId('alertzeroSignificantSecurityEventHuntResultOutcome');
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventHuntResultHitSources')
      ).toHaveTextContent('Confirmed by Tier 2');
      expect(outcome).toHaveTextContent('Environment hits found');
    });

    it('marks optional indices in the distribution legend', () => {
      // Tier 1's hit bar is computed from required indices only, so an unlabeled optional
      // segment reads as part of the corroborating total.
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );

      const huntSection = screen.getByTestId(
        'alertzeroSignificantSecurityEventTechnicalRunDetails'
      );
      expect(huntSection).toHaveTextContent('logs-endpoint.events.network-default (4) optional');
      expect(screen.getAllByText('optional')).toHaveLength(1);
    });

    it('tells the four behavior outcomes apart, and leaves an unreported one blank', () => {
      const behavior = {
        technique_id: 'T1021',
        tactic_ids: ['TA0008'],
        confidence: 0.75,
        title: 'Lateral movement via RDP',
      };
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                tier2: {
                  status: 'behaviors_proposed' as const,
                  behaviors: [
                    { ...behavior, execution: { executed: true, row_count: 4, hit: true } },
                    { ...behavior, execution: { executed: true, row_count: 0, hit: false } },
                    {
                      ...behavior,
                      execution: {
                        executed: true,
                        row_count: 4,
                        hit: false,
                        inconclusive_reason: 'rows_unclassifiable' as const,
                      },
                    },
                    { ...behavior, execution: { executed: false, row_count: 0, hit: false } },
                    behavior,
                  ],
                },
              },
            })
          )}
        />
      );

      expect(screen.getByText('Hit: 4 rows')).toBeInTheDocument();
      expect(screen.getByText('No rows')).toBeInTheDocument();
      expect(screen.getByText('Inconclusive')).toBeInTheDocument();
      expect(screen.getByText('rows_unclassifiable')).toBeInTheDocument();
      expect(screen.getByText('Not executed')).toBeInTheDocument();
    });

    it('marks the lists the producer truncated', () => {
      const truncatedIds = [
        'alertzeroSignificantSecurityEventHuntResultPerIndexTruncated',
        'alertzeroSignificantSecurityEventHuntResultResolvedIocsTruncated',
        'alertzeroSignificantSecurityEventHuntResultBehaviorsTruncated',
      ];

      const { unmount } = renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                tier1: {
                  ...huntResult.tier1,
                  resolved_iocs: [{ type: 'ip' as const, value: '203.0.113.5' }],
                  per_index_truncated: true,
                  resolved_iocs_truncated: true,
                },
                tier2: { ...huntResult.tier2, behaviors_truncated: true },
              },
            })
          )}
        />
      );
      for (const testId of truncatedIds) {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      }
      unmount();

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                tier1: {
                  ...huntResult.tier1,
                  resolved_iocs: [{ type: 'ip' as const, value: '203.0.113.5' }],
                },
              },
            })
          )}
        />
      );
      for (const testId of truncatedIds) {
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
      }
    });
  });

  describe('layout', () => {
    const behavior = {
      technique_id: 'T1021',
      tactic_ids: ['TA0008'],
      confidence: 0.75,
      title: 'Lateral movement via RDP',
    };

    const detailSections = [
      ['alertzeroSignificantSecurityEventCitedEvidence', '1 event'],
      ['alertzeroSignificantSecurityEventBehaviorValidation', 'Behavior validation (1)'],
      ['alertzeroSignificantSecurityEventTechnicalRunDetails', 'Technical run details'],
    ] as const;

    const renderWithDetails = () =>
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
              hunt_result: huntResult,
            })
          )}
        />
      );

    it('starts with all three detail sections collapsed', () => {
      renderWithDetails();

      for (const [testId, name] of detailSections) {
        expect(within(screen.getByTestId(testId)).getByRole('button', { name })).toHaveAttribute(
          'aria-expanded',
          'false'
        );
      }
    });

    it('expands each detail section independently', async () => {
      const user = userEvent.setup();
      renderWithDetails();

      const buttonFor = (index: number) => {
        const [testId, name] = detailSections[index];
        return within(screen.getByTestId(testId)).getByRole('button', { name });
      };

      await user.click(buttonFor(1));
      expect(buttonFor(0)).toHaveAttribute('aria-expanded', 'false');
      expect(buttonFor(1)).toHaveAttribute('aria-expanded', 'true');
      expect(buttonFor(2)).toHaveAttribute('aria-expanded', 'false');

      await user.click(buttonFor(2));
      expect(buttonFor(1)).toHaveAttribute('aria-expanded', 'true');
      expect(buttonFor(2)).toHaveAttribute('aria-expanded', 'true');

      await user.click(buttonFor(1));
      expect(buttonFor(1)).toHaveAttribute('aria-expanded', 'false');
      expect(buttonFor(2)).toHaveAttribute('aria-expanded', 'true');
    });

    it('labels the cited evidence section with its event and alert counts', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: Array.from({ length: 5 }, (_, index) => ({
                event_id: `evt-${index}`,
                source_index: '.ds-logs-default-2026.09.22-000001',
              })),
              alerts: [
                { alert_id: 'alert-1', index: '.alerts-security.alerts-default' },
                { alert_id: 'alert-2', index: '.alerts-security.alerts-default' },
              ],
            })
          )}
        />
      );

      expect(
        within(screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence')).getByRole(
          'button',
          { name: '5 events, 2 alerts' }
        )
      ).toBeInTheDocument();
    });

    it.each([
      [{ alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }] }, '1 alert'],
      [
        {
          events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
          alerts: [
            { alert_id: 'alert-1', index: '.alerts-security.alerts-default' },
            { alert_id: 'alert-2', index: '.alerts-security.alerts-default' },
          ],
        },
        '1 event, 2 alerts',
      ],
      [
        {
          events: [
            { event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' },
            { event_id: 'evt-2', source_index: '.ds-logs-default-2026.09.22-000001' },
          ],
          alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }],
        },
        '2 events, 1 alert',
      ],
    ])('labels the cited evidence section for %j as %s', (refs, label) => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, ...refs }))}
        />
      );

      expect(
        within(screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence')).getByRole(
          'button',
          { name: label }
        )
      ).toBeInTheDocument();
    });

    it('shows the cited events before the cited alerts', async () => {
      const user = userEvent.setup();
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
              alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }],
            })
          )}
        />
      );

      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
      await user.click(within(accordion).getByRole('button', { name: '1 event, 1 alert' }));
      const event = within(accordion).getByTestId(
        'alertzeroSignificantSecurityEventEventLink-evt-1'
      );
      const alert = within(accordion).getByTestId('alertzeroSignificantSecurityEventAlerts');
      expect(event.compareDocumentPosition(alert)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders the provenance cards in order inside technical run details', () => {
      renderWithDetails();

      const details = screen.getByTestId('alertzeroSignificantSecurityEventTechnicalRunDetails');
      expect(
        within(details)
          .getAllByTestId(
            /^alertzeroSignificantSecurityEvent(RunId|ReportLink|SourceWatch|Capability)$/
          )
          .map((element) => element.getAttribute('data-test-subj'))
      ).toEqual([
        'alertzeroSignificantSecurityEventRunId',
        'alertzeroSignificantSecurityEventReportLink',
        'alertzeroSignificantSecurityEventSourceWatch',
        'alertzeroSignificantSecurityEventCapability',
      ]);
      expect(screen.getByTestId('alertzeroSignificantSecurityEventSourceWatch')).toHaveTextContent(
        'watch-1'
      );
      expect(screen.getByTestId('alertzeroSignificantSecurityEventCapability')).toHaveTextContent(
        'lateral-movement-detector'
      );
    });

    it('keeps evidence for and against inside technical run details only', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, evidence_against: ['counter'] }))}
        />
      );

      const details = screen.getByTestId('alertzeroSignificantSecurityEventTechnicalRunDetails');
      expect(details).toContainElement(screen.getByText('Evidence for'));
      expect(details).toContainElement(screen.getByText('Evidence against'));
      expect(details).toContainElement(screen.getByText('counter'));
    });

    it('renders technical run details even without a hunt result', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );

      const details = screen.getByTestId('alertzeroSignificantSecurityEventTechnicalRunDetails');
      expect(
        within(details).getByTestId('alertzeroSignificantSecurityEventRunId')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventHuntResultOutcome')
      ).not.toBeInTheDocument();
    });

    it('caps the entity chips at ten and reveals the rest on request', async () => {
      const user = userEvent.setup();
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              entities: Array.from({ length: 12 }, (_, index) => ({
                field: 'host.name' as const,
                value: `host-${index}`,
              })),
            })
          )}
        />
      );

      expect(screen.getByTestId('alertzeroSignificantSecurityEventEntity-9')).toBeInTheDocument();
      expect(screen.queryByTestId('alertzeroSignificantSecurityEventEntity-10')).toBeNull();
      const overflow = screen.getByTestId('alertzeroSignificantSecurityEventEntitiesOverflow');
      expect(overflow).toHaveTextContent('+2 more');

      await user.click(overflow);
      expect(screen.getByTestId('alertzeroSignificantSecurityEventEntity-11')).toBeInTheDocument();
      expect(overflow).toHaveTextContent('Show fewer');

      await user.click(overflow);
      expect(screen.queryByTestId('alertzeroSignificantSecurityEventEntity-10')).toBeNull();
    });

    it('does not render a legacy timeline or proposal, or prompt for a case', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              timeline: [{ at: '2024-01-01T00:00:00Z', what: 'RDP session opened' }],
              maps_to_proposal: {
                category: 'credential_theft',
                impact: 'Attacker can pivot to additional hosts.',
                actionWorkflowId: 'wf-isolate-host',
                actionInput: { endpoint_ids: 'abc-123' },
                manual_remediation: ['Rotate the affected credentials'],
              },
            })
          )}
        />
      );

      const card = screen.getByTestId(SSE_ATTACHMENT_TEST_ID);
      for (const text of [
        'Timeline',
        'RDP session opened',
        'Proposal',
        'credential_theft',
        'Attacker can pivot to additional hosts.',
        'wf-isolate-host',
        'abc-123',
        'Rotate the affected credentials',
        /case/i,
      ]) {
        expect(within(card).queryByText(text)).toBeNull();
      }
      expect(screen.queryByTestId('alertzeroSignificantSecurityEventTimeline')).toBeNull();
      expect(screen.queryByTestId('alertzeroSignificantSecurityEventProposal')).toBeNull();
    });

    describe('outcome counts', () => {
      const tileFor = (label: string) => {
        const outcome = screen.getByTestId('alertzeroSignificantSecurityEventOutcome');
        const tile = within(outcome).getByText(label).closest('.euiFlexItem');
        expect(tile).not.toBeNull();
        return tile as HTMLElement;
      };

      const executedHit = (extras: Record<string, unknown> = {}) => ({
        ...behavior,
        execution: { executed: true, row_count: 2, hit: true },
        ...extras,
      });

      const clean = (
        tier1: { status?: 'no_environment_hits' | 'scope_blocked' | 'no_searchable_terms' } = {}
      ) => ({
        has_confirmed_hit: false,
        hit_sources: [] as never[],
        time_range: huntResult.time_range,
        tier1: {
          status: 'no_environment_hits' as const,
          counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
          per_index: [],
          resolved_iocs: [],
          ...tier1,
        },
      });

      const tier2OnlyHit = (behaviors: Array<ReturnType<typeof executedHit>>) => ({
        ...clean({}),
        has_confirmed_hit: true,
        hit_sources: ['tier2' as const],
        tier2: { status: 'behaviors_proposed' as const, behaviors },
      });

      const render = (hunt: unknown, extra: Record<string, unknown> = {}) =>
        renderWithI18n(
          <SignificantSecurityEventInlineContent
            {...renderProps(
              buildAttachment({
                ...baseData,
                ...extra,
                hunt_result: hunt as typeof huntResult,
              })
            )}
          />
        );

      it('reports Tier 1 counts, with Tier 2 names and behavior hits alongside rather than summed', () => {
        render({
          ...huntResult,
          hit_sources: ['tier1' as const, 'tier2' as const],
          tier2: {
            status: 'behaviors_proposed' as const,
            behaviors: [
              executedHit({ affected_hosts: ['a', 'b', 'c'], affected_hosts_truncated: true }),
              executedHit({ technique_id: 'T1078', affected_hosts: ['a'] }),
            ],
          },
        });

        expect(tileFor('Environment hits')).toHaveTextContent(
          /^Environment hits\+ 2 behavior hits12$/
        );
        expect(tileFor('Affected hosts')).toHaveTextContent(
          /^Affected hostsTier 2 also reports 3\+2$/
        );
        expect(tileFor('Affected users')).toHaveTextContent(/^Affected users3$/);
      });

      it('words the single behavior hit caption in the singular', () => {
        render({
          ...huntResult,
          hit_sources: ['tier1' as const, 'tier2' as const],
          tier2: { status: 'behaviors_proposed' as const, behaviors: [executedHit()] },
        });

        expect(tileFor('Environment hits')).toHaveTextContent('+ 1 behavior hit');
      });

      it('counts Tier 2 hosts and users when Tier 1 found nothing, marking a truncated list', () => {
        render(
          tier2OnlyHit([
            executedHit({ affected_hosts: ['h1', 'h2'], affected_users: ['u1'] }),
            executedHit({
              technique_id: 'T1078',
              affected_hosts: ['h2', 'h3'],
              affected_hosts_truncated: true,
            }),
          ])
        );

        expect(tileFor('Environment hits')).toHaveTextContent(
          /^Environment hits\+ 2 behavior hits0$/
        );
        expect(tileFor('Affected hosts')).toHaveTextContent(/^Affected hosts3\+$/);
        expect(tileFor('Affected users')).toHaveTextContent(/^Affected users1$/);
      });

      it('shows a dash, never zero, when hit behaviors list no names', () => {
        render(tier2OnlyHit([executedHit()]));

        expect(tileFor('Affected hosts')).toHaveTextContent(/^Affected hosts–$/);
        expect(tileFor('Affected users')).toHaveTextContent(/^Affected users–$/);
      });

      it('shows a real zero when the hunt ran and found nothing', () => {
        render(clean({}));

        expect(tileFor('Environment hits')).toHaveTextContent(/^Environment hits0$/);
        expect(tileFor('Affected hosts')).toHaveTextContent(/^Affected hosts0$/);
        expect(tileFor('Affected users')).toHaveTextContent(/^Affected users0$/);
      });

      it.each([
        ['scope_blocked' as const, 'Hunt did not run: scope blocked'],
        ['no_searchable_terms' as const, 'No searchable terms'],
      ])('shows dashes, never zeros, for a %s Tier 1', (status, statusLabel) => {
        render(clean({ status }));

        expect(tileFor(statusLabel)).toHaveTextContent(new RegExp(`^${statusLabel}–$`));
        expect(tileFor('Affected hosts')).toHaveTextContent(/^Affected hosts–$/);
        expect(tileFor('Affected users')).toHaveTextContent(/^Affected users–$/);
      });

      it('keeps the behavior hit caption under a Tier 1 that did not run', () => {
        render({
          ...tier2OnlyHit([executedHit({ affected_hosts: ['h1'] })]),
          tier1: { ...clean({}).tier1, status: 'no_searchable_terms' as const },
        });

        expect(tileFor('No searchable terms')).toHaveTextContent(
          /^No searchable terms\+ 1 behavior hit–$/
        );
        expect(tileFor('Affected hosts')).toHaveTextContent(/^Affected hosts1$/);
      });

      it('counts cited references as event rows plus alert rows', () => {
        render(huntResult, {
          events: [
            { event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' },
            { event_id: 'evt-2', source_index: '.ds-logs-default-2026.09.22-000001' },
            { event_id: 'evt-3', source_index: '.ds-logs-default-2026.09.22-000001' },
          ],
          alerts: [
            { alert_id: 'alert-1', index: '.alerts-security.alerts-default' },
            { alert_id: 'alert-2', index: '.alerts-security.alerts-default' },
          ],
        });

        expect(tileFor('Cited references')).toHaveTextContent(/^Cited references5$/);
      });

      it('hides the window, hit, host and user counts without a hunt result', () => {
        renderWithI18n(
          <SignificantSecurityEventInlineContent
            {...renderProps(
              buildAttachment({
                ...baseData,
                alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }],
              })
            )}
          />
        );

        const outcome = screen.getByTestId('alertzeroSignificantSecurityEventOutcome');
        expect(outcome).toHaveTextContent(/^Cited references1$/);
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventHuntWindow')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventConfirmedHit')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId('alertzeroSignificantSecurityEventBehaviorValidation')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('behavior validation', () => {
    const esql = 'FROM logs-endpoint.events.process-* | WHERE process.name == "psexec.exe"';

    const behaviorAt = (
      index: number,
      extras: {
        technique_id?: string;
        validated_esql?: string;
        execution?: {
          executed: boolean;
          row_count: number;
          hit: boolean;
          inconclusive_reason?: 'rows_unclassifiable';
        };
      } = {}
    ) => ({
      technique_id: `T10${index}`,
      tactic_ids: ['TA0008'],
      confidence: 0.75,
      title: `Behavior ${index}`,
      ...extras,
    });

    const hunt = (behaviors: Array<ReturnType<typeof behaviorAt>>) => ({
      ...huntResult,
      // The schema ties Tier 2 as a confirming source to an executed hit.
      hit_sources: behaviors.some((behavior) => behavior.execution?.hit)
        ? ['tier1' as const, 'tier2' as const]
        : ['tier1' as const],
      tier2: { status: 'behaviors_proposed' as const, behaviors },
    });

    const shareReturning = (url: string) => {
      const getRedirectUrl = jest.fn().mockReturnValue(url);
      const share = {
        url: { locators: { get: () => ({ getRedirectUrl }) } },
      } as unknown as SharePluginStart;
      return { share, getRedirectUrl };
    };

    const renderOpen = async (
      behaviors: Array<ReturnType<typeof behaviorAt>>,
      navigation: Parameters<typeof renderProps>[1] = defaultNavigation
    ) => {
      const user = userEvent.setup();
      const result = renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({ ...baseData, hunt_result: hunt(behaviors) }),
            navigation
          )}
        />
      );
      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventBehaviorValidation');
      await user.click(
        within(accordion).getByRole('button', { name: `Behavior validation (${behaviors.length})` })
      );
      return { user, ...result };
    };

    const techniqueLinks = () =>
      screen.queryAllByTestId(/^alertzeroSignificantSecurityEventHuntResultTechniqueLink-/);

    it('pages behaviors five at a time and offers 5, 10 and 25 rows', async () => {
      const { user } = await renderOpen(
        Array.from({ length: 7 }, (_, index) => behaviorAt(index + 1))
      );

      expect(techniqueLinks()).toHaveLength(5);
      expect(screen.queryByText('Behavior 6')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('tablePaginationPopoverButton'));
      for (const size of [5, 10, 25]) {
        expect(screen.getByTestId(`tablePagination-${size}-rows`)).toBeInTheDocument();
      }
      await user.click(screen.getByTestId('tablePagination-10-rows'));
      expect(techniqueLinks()).toHaveLength(7);
    });

    it('keeps the producer order', async () => {
      await renderOpen([behaviorAt(3), behaviorAt(1), behaviorAt(2)]);

      expect(
        techniqueLinks().map((link) => link.getAttribute('data-test-subj')?.split('-').pop())
      ).toEqual(['T103', 'T101', 'T102']);
    });

    it('shows no pagination controls for five behaviors or fewer', async () => {
      await renderOpen(Array.from({ length: 5 }, (_, index) => behaviorAt(index + 1)));

      expect(screen.queryByTestId('tablePaginationPopoverButton')).not.toBeInTheDocument();
    });

    it('notes a truncated behavior list inside the section', async () => {
      const user = userEvent.setup();
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                tier2: { ...huntResult.tier2, behaviors_truncated: true },
              },
            })
          )}
        />
      );

      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventBehaviorValidation');
      await user.click(within(accordion).getByRole('button', { name: 'Behavior validation (1)' }));
      expect(
        within(accordion).getByTestId(
          'alertzeroSignificantSecurityEventHuntResultBehaviorsTruncated'
        )
      ).toBeInTheDocument();
    });

    describe('Continue in Discover', () => {
      const continueLink = (rowIndex: number) =>
        screen.queryByTestId(`alertzeroSignificantSecurityEventContinueInDiscover-${rowIndex}`);

      it('opens the exact query over the absolute hunt window in a new tab', async () => {
        const { share, getRedirectUrl } = shareReturning('https://example.test/continue');
        await renderOpen(
          [
            behaviorAt(1, {
              validated_esql: esql,
              execution: { executed: true, row_count: 3, hit: true },
            }),
          ],
          { ...defaultNavigation, share }
        );

        const link = continueLink(0);
        expect(link).toHaveAttribute('href', 'https://example.test/continue');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link?.getAttribute('rel')).toContain('noopener');
        expect(link).toHaveAttribute('aria-label', 'Continue in Discover: T101 (behavior 1)');
        expect(getRedirectUrl).toHaveBeenCalledWith({
          query: { esql },
          timeRange: huntResult.time_range,
          useHash: true,
        });
      });

      it('numbers the behaviors one-based so a shared technique id stays distinguishable', async () => {
        const { share } = shareReturning('https://example.test/continue');
        const executed = { executed: true, row_count: 1, hit: true };
        await renderOpen(
          [
            behaviorAt(1, { technique_id: 'T1021', validated_esql: esql, execution: executed }),
            behaviorAt(2, { technique_id: 'T1021', validated_esql: esql, execution: executed }),
          ],
          { ...defaultNavigation, share }
        );

        expect(continueLink(0)).toHaveAttribute(
          'aria-label',
          'Continue in Discover: T1021 (behavior 1)'
        );
        expect(continueLink(1)).toHaveAttribute(
          'aria-label',
          'Continue in Discover: T1021 (behavior 2)'
        );
      });

      it('is offered for executed zero-row and unclassifiable runs too', async () => {
        const { share } = shareReturning('https://example.test/continue');
        await renderOpen(
          [
            behaviorAt(1, {
              validated_esql: esql,
              execution: { executed: true, row_count: 0, hit: false },
            }),
            behaviorAt(2, {
              validated_esql: esql,
              execution: {
                executed: true,
                row_count: 4,
                hit: false,
                inconclusive_reason: 'rows_unclassifiable' as const,
              },
            }),
          ],
          { ...defaultNavigation, share }
        );

        expect(continueLink(0)).toBeInTheDocument();
        expect(continueLink(1)).toBeInTheDocument();
      });

      it('is withheld for unexecuted, unreported and queryless behaviors', async () => {
        const { share } = shareReturning('https://example.test/continue');
        await renderOpen(
          [
            behaviorAt(1, {
              validated_esql: esql,
              execution: { executed: false, row_count: 0, hit: false },
            }),
            behaviorAt(2, { validated_esql: esql }),
            behaviorAt(3, { execution: { executed: true, row_count: 1, hit: true } }),
          ],
          { ...defaultNavigation, share }
        );

        for (const rowIndex of [0, 1, 2]) {
          expect(continueLink(rowIndex)).not.toBeInTheDocument();
        }
      });

      it('is withheld when Discover is unavailable or the redirect is too long', async () => {
        const executed = { executed: true, row_count: 1, hit: true };
        const { unmount } = await renderOpen(
          [behaviorAt(1, { validated_esql: esql, execution: executed })],
          defaultNavigation
        );
        expect(continueLink(0)).not.toBeInTheDocument();
        unmount();

        const { share } = shareReturning(`https://example.test/${'x'.repeat(9000)}`);
        await renderOpen([behaviorAt(1, { validated_esql: esql, execution: executed })], {
          ...defaultNavigation,
          share,
        });
        expect(continueLink(0)).not.toBeInTheDocument();
      });

      it('says which hunt window it opens with', async () => {
        const { share } = shareReturning('https://example.test/continue');
        const { user } = await renderOpen(
          [
            behaviorAt(1, {
              validated_esql: esql,
              execution: { executed: true, row_count: 1, hit: true },
            }),
          ],
          { ...defaultNavigation, share }
        );

        await user.hover(continueLink(0) as HTMLElement);
        expect(
          await screen.findByText(
            'Opens with the hunt window 2024-01-01T00:00:00Z to 2024-01-02T00:00:00Z'
          )
        ).toBeInTheDocument();
      });

      it('never shows the raw ES|QL anywhere on the card', async () => {
        const { share } = shareReturning('https://example.test/continue');
        await renderOpen(
          [
            behaviorAt(1, {
              validated_esql: esql,
              execution: { executed: true, row_count: 1, hit: true },
            }),
          ],
          { ...defaultNavigation, share }
        );

        const card = screen.getByTestId(SSE_ATTACHMENT_TEST_ID);
        expect(card).not.toHaveTextContent('psexec.exe');
        expect(card).not.toHaveTextContent('FROM logs-endpoint');
      });
    });
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

  it('renders when resolved_iocs is absent on the hunt result', () => {
    const { resolved_iocs: _omit, ...tier1WithoutResolved } = huntResult.tier1;
    renderWithI18n(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            hunt_result: {
              ...huntResult,
              tier1: {
                ...tier1WithoutResolved,
                searched_ioc_count: 2,
              },
            },
          })
        )}
      />
    );

    expect(screen.getByTestId(SSE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(
      screen.queryByTestId('alertzeroSignificantSecurityEventHuntResultResolvedIocs')
    ).not.toBeInTheDocument();
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
              // Cleared alongside the boolean: the schema only accepts an empty source list
              // for a run that confirmed nothing.
              hit_sources: [],
              tier1: {
                ...huntResult.tier1,
                status: 'no_searchable_terms' as const,
                // The schema now ties status to counts, so a hunt that found nothing must
                // carry zero counts to be a valid payload — and an empty breakdown with them,
                // since the per-index hit counts cannot sum past the total.
                counts: {
                  ...huntResult.tier1.counts,
                  total_hits: 0,
                  returned_hits: 0,
                  affected_hosts: 0,
                  affected_users: 0,
                },
                per_index: [],
              },
            },
          })
        )}
      />
    );

    expect(screen.getByTestId('alertzeroSignificantSecurityEventStatusRow')).toHaveTextContent(
      'No confirmed hit'
    );
    expect(
      screen.getByTestId('alertzeroSignificantSecurityEventHuntResultOutcome')
    ).toHaveTextContent('No searchable terms');
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
    expect(screen.getByText('Environment hits (sampled)')).toBeInTheDocument();
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
