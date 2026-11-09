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
  SSE_ATTACHMENT_HEADLINE_TEST_ID,
  SSE_ATTACHMENT_BASIS_TEST_ID,
  SSE_ATTACHMENT_ENTITY_LINE_TEST_ID,
  SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID,
  SSE_ATTACHMENT_INDEX_HITS_TEST_ID,
  SSE_ATTACHMENT_QUERIES_RUN_TEST_ID,
  SSE_ATTACHMENT_SEARCHED_FOR_TEST_ID,
} from './significant_security_event_inline_content';
import type { SignificantSecurityEventAttachment } from './view_model';
import { buildEntityLookupEsql, buildEventLookupEsql, buildIocMatchEsql } from '../navigation';
import { isExecutableHuntQuery } from '../../../../common/sse_view';
import {
  buildAttachment as buildAttachmentGeneric,
  createMockShare,
  createMockNavigation,
  renderProps as renderPropsGeneric,
} from '../test_utils';

type SseData = SignificantSecurityEventAttachment['data'];
type HuntResultData = NonNullable<SseData['hunt_result']>;
type Tier2Behavior = NonNullable<HuntResultData['tier2']>['behaviors'][number];
type DetectionData = NonNullable<SseData['detections']>[number];

const buildAttachment = (data: SseData): SignificantSecurityEventAttachment =>
  buildAttachmentGeneric('security.significant_security_event', data);

const mockShare = createMockShare();

const defaultNavigation = createMockNavigation();

const renderProps = (
  attachment: SignificantSecurityEventAttachment,
  navigation: typeof defaultNavigation & {
    share?: SharePluginStart;
    getUrlForApp?: (appId: string, options?: { path?: string }) => string;
  } = defaultNavigation
) => renderPropsGeneric(attachment, navigation);

/** A real, runnable ES|QL query (first command is FROM), so it earns a query row. */
const EXECUTABLE_ESQL = 'FROM logs-endpoint.events.process-* | WHERE process.name == "psexec.exe"';
/** A comment-only placeholder a model left behind: parses, but has no command to run. */
const PLACEHOLDER_ESQL = '// Behavior title / technique';

const baseData: SseData = {
  title: 'Suspicious lateral movement',
  severity: 'high',
  confidence: 0.8,
  status: 'open',
  source_watch: 'watch-1',
  capability: 'lateral-movement-detector',
  run_id: 'run-1',
  security_knowledge_indicators: [
    { type: 'technique', value: 'T1021', confidence: 0.9, technique_id: 'T1021' },
  ],
  report_id: 'ti-report-1',
  entities: [
    { field: 'host.name', value: 'host-1' },
    { field: 'user.name', value: 'user-1' },
  ],
  hypothesis_tested: 'Attacker pivoted via RDP',
  evidence_for: ['e1', 'e2'],
  evidence_against: [],
  evaluation_record_ref: 'eval-1',
};

const huntResult: HuntResultData = {
  has_confirmed_hit: true,
  // Tier 1 alone: the base behavior is a proposal that never executed.
  hit_sources: ['tier1'],
  time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
  tier1: {
    status: 'environment_hits_found',
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
    status: 'behaviors_proposed',
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

/** A share whose redirect always resolves to `url`, for asserting the exact locator params. */
const shareReturning = (url: string) => {
  const getRedirectUrl = jest.fn().mockReturnValue(url);
  const share = {
    url: { locators: { get: () => ({ getRedirectUrl }) } },
  } as unknown as SharePluginStart;
  return { share, getRedirectUrl };
};

describe('SignificantSecurityEventInlineContent', () => {
  it('renders the empty state for malformed data', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment({} as SseData))} />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders the run_id, hypothesis, and entities from a valid payload', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('alertzeroSignificantSecurityEventRunId')).toHaveTextContent('run-1');
    expect(
      screen.queryByTestId('alertzeroSignificantSecurityEventReportLink')
    ).not.toBeInTheDocument();
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
    expect(screen.queryByTestId(SSE_ATTACHMENT_HEADLINE_TEST_ID)).toBeNull();
  });

  describe('headline fallback when Agent Builder omits its chrome header', () => {
    it('renders title, severity, status and confidence when there is no action button', () => {
      // No events and no alerts means no Discover action, so the platform header is absent.
      renderWithI18n(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );

      const headline = screen.getByTestId(SSE_ATTACHMENT_HEADLINE_TEST_ID);
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

      expect(screen.queryByTestId(SSE_ATTACHMENT_HEADLINE_TEST_ID)).toBeNull();
    });
  });

  describe('empty sections', () => {
    const cases: Array<{
      name: string;
      data: Partial<SseData>;
      assert: () => void;
    }> = [
      {
        name: 'entity line',
        data: { entities: [] },
        assert: () =>
          expect(screen.queryByTestId(SSE_ATTACHMENT_ENTITY_LINE_TEST_ID)).not.toBeInTheDocument(),
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
        name: 'evidence',
        data: { evidence_for: [], evidence_against: [] },
        assert: () => {
          expect(screen.queryByText('Evidence for')).not.toBeInTheDocument();
          expect(screen.queryByText('Evidence against')).not.toBeInTheDocument();
        },
      },
      {
        name: 'what matched',
        data: { detections: [] },
        assert: () =>
          expect(screen.queryByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).not.toBeInTheDocument(),
      },
      {
        name: 'hunt result',
        data: {},
        assert: () => {
          expect(screen.queryByTestId('alertzeroSignificantSecurityEventHuntWindow')).toBeNull();
          expect(screen.queryByTestId(SSE_ATTACHMENT_QUERIES_RUN_TEST_ID)).toBeNull();
        },
      },
    ];

    it.each(cases)('renders nothing for the $name section when empty', ({ data, assert }) => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, ...data }))}
        />
      );
      assert();
    });
  });

  describe('entity line', () => {
    it('frames host/user chips as Involved after what matched', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: huntResult,
              detections: [
                {
                  id: 'ioc:ip:203.0.113.5',
                  kind: 'ioc',
                  field: 'destination.ip',
                  basis: 'ioc_strong',
                  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
                  total: 4,
                },
              ],
            })
          )}
        />
      );

      const entityLine = screen.getByTestId(SSE_ATTACHMENT_ENTITY_LINE_TEST_ID);
      expect(entityLine).toHaveTextContent('Involved');
      expect(entityLine).toHaveTextContent('host-1');
      expect(entityLine).toHaveTextContent('user-1');
      expect(entityLine).toHaveTextContent('2 hosts');
      expect(entityLine).toHaveTextContent('3 users');

      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      expect(whatMatched.compareDocumentPosition(entityLine)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    it('widens the host and user counts to Tier 1 when it saw more than the chips', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );

      const entityLine = screen.getByTestId(SSE_ATTACHMENT_ENTITY_LINE_TEST_ID);
      expect(entityLine).toHaveTextContent('2 hosts');
      expect(entityLine).toHaveTextContent('3 users');
    });

    it('renders entity refs as Discover links on the exact ECS field, ordered host then user', () => {
      const entities: SseData['entities'] = [
        { field: 'user.name', value: 'dev-user' },
        { field: 'user.name', value: 'escalated-role' },
        { field: 'host.name', value: 'ci-deploy-runner-07' },
      ];
      const hostEsql = buildEntityLookupEsql({ field: 'host.name', value: 'ci-deploy-runner-07' });
      const userEsql = buildEntityLookupEsql({ field: 'user.name', value: 'dev-user' });
      const roleEsql = buildEntityLookupEsql({ field: 'user.name', value: 'escalated-role' });

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, entities }), {
            ...defaultNavigation,
            share: mockShare,
          })}
        />
      );

      // Ordered host → user → user, so the host chip leads regardless of input order.
      const expectations: Array<[string, string, string]> = [
        ['alertzeroSignificantSecurityEventEntity-0', 'ci-deploy-runner-07', hostEsql as string],
        ['alertzeroSignificantSecurityEventEntity-1', 'dev-user', userEsql as string],
        ['alertzeroSignificantSecurityEventEntity-2', 'escalated-role', roleEsql as string],
      ];

      for (const [testId, value, esql] of expectations) {
        const chip = screen.getByTestId(testId);
        expect(chip).toHaveTextContent(value);
        const badge = chip.querySelector('.euiBadge');
        fireEvent.mouseEnter(badge as Element);
        const openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
        fireEvent.click(screen.getByLabelText('Open in Discover'));
        expect(openWindowSpy).toHaveBeenCalledWith(
          `https://example.test/discover?esql=${encodeURIComponent(esql)}`,
          '_blank',
          'noopener,noreferrer'
        );
        openWindowSpy.mockRestore();
        fireEvent.mouseLeave(badge as Element);
      }
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
  });

  describe('evidence', () => {
    it('renders the evidence for section when populated', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );
      expect(screen.getByText('Evidence for')).toBeInTheDocument();
      expect(screen.getByText('e1')).toBeInTheDocument();
      expect(screen.getByText('e2')).toBeInTheDocument();
    });

    it('renders evidence after what matched in the attack story', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              evidence_against: ['counter'],
              hunt_result: huntResult,
              detections: [
                {
                  id: 'ioc:ip:203.0.113.5',
                  kind: 'ioc',
                  field: 'destination.ip',
                  basis: 'ioc_strong',
                  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
                  total: 4,
                },
              ],
            })
          )}
        />
      );

      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      const evidence = screen.getByTestId('alertzeroSignificantSecurityEventEvidence');
      expect(whatMatched.compareDocumentPosition(evidence)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventTechnicalRunDetails')
      ).not.toBeInTheDocument();
    });

    it('renders evidence bullets as written; the mapper decides what to withhold', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              evidence_for: [
                'IOC Hunt matched 12 event(s) in the hunt window, at least one in a required index (see hunt_result.tier1.per_index for the required/optional split).',
                'Behavior Hunt executed T1071 with 3 required-index row(s).',
                'Unusual outbound curl to loopback across two hosts',
              ],
              evidence_against: [
                'Behavior Hunt executed 1 proposed technique(s) with no required-index rows: T1059.',
              ],
              detections: [
                {
                  id: 'ioc:ip:203.0.113.5',
                  kind: 'ioc',
                  field: 'destination.ip',
                  basis: 'ioc_strong',
                  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
                  total: 4,
                },
              ],
            })
          )}
        />
      );

      const evidence = screen.getByTestId('alertzeroSignificantSecurityEventEvidence');
      expect(evidence).toHaveTextContent('Unusual outbound curl to loopback across two hosts');
      expect(evidence).toHaveTextContent('T1059');
      expect(evidence).toHaveTextContent('IOC Hunt matched 12 event(s)');
      expect(evidence).toHaveTextContent('Behavior Hunt executed T1071');
    });

    it('reveals the evidence past the visible limit on request', async () => {
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
  });

  describe('what matched', () => {
    const iocDetection = (overrides: Partial<DetectionData> = {}): DetectionData => ({
      id: 'ioc:ip:203.0.113.5',
      kind: 'ioc',
      field: 'destination.ip',
      basis: 'ioc_strong',
      matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
      total: 3,
      ...overrides,
    });

    it('pivots an IOC row over every Tier 1 index for the observed matched field and value', () => {
      const { share, getRedirectUrl } = shareReturning('https://example.test/pivot');
      const eventIndex = '.ds-logs-endpoint.events.process-default-2026.09.22-000001';
      // Every index the hunt searched, not only the one the sampled event came from.
      const expectedEsql = buildIocMatchEsql({
        indices: huntResult.tier1.per_index.map((row) => row.index),
        field: 'destination.ip',
        value: '203.0.113.5',
        iocType: 'ip',
      });

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              // Stored per_ioc field can be the wrong first-searched slot; cited events win.
              detections: [
                iocDetection({
                  field: 'source.ip',
                  matched_on: [{ field: 'source.ip', value: '203.0.113.5' }],
                }),
              ],
              events: [
                {
                  event_id: 'evt-1',
                  source_index: eventIndex,
                  matched: {
                    field: 'destination.ip',
                    iocs: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip' }],
                  },
                },
              ],
              hunt_result: huntResult,
            }),
            { ...defaultNavigation, share }
          )}
        />
      );

      expect(getRedirectUrl).toHaveBeenCalledWith({
        query: { esql: expectedEsql },
        timeRange: huntResult.time_range,
        useHash: true,
      });
      expect(
        within(screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).getByText('destination.ip')
      ).toBeInTheDocument();
    });

    it('falls back to every Tier 1 index when no cited events observe the IOC', () => {
      const { share, getRedirectUrl } = shareReturning('https://example.test/pivot');
      const indices = huntResult.tier1.per_index.map((row) => row.index);
      const expectedEsql = buildIocMatchEsql({
        indices,
        field: 'destination.ip',
        value: '203.0.113.5',
      });

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [iocDetection()],
              events: [],
              hunt_result: huntResult,
            }),
            { ...defaultNavigation, share }
          )}
        />
      );

      expect(getRedirectUrl).toHaveBeenCalledWith({
        query: { esql: expectedEsql },
        timeRange: huntResult.time_range,
        useHash: true,
      });
    });

    it('adds cited-event indices to a truncated per-index breakdown so the pivot can find the match', () => {
      const { share, getRedirectUrl } = shareReturning('https://example.test/pivot');
      const omittedIndex = '.ds-logs-aws.cloudtrail-default-2026.09.22-000001';
      const expectedEsql = buildIocMatchEsql({
        indices: [...huntResult.tier1.per_index.map((row) => row.index), omittedIndex],
        field: 'destination.ip',
        value: '203.0.113.5',
        iocType: 'ip',
      });

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [iocDetection()],
              events: [
                {
                  event_id: 'evt-omitted',
                  source_index: omittedIndex,
                  matched: {
                    field: 'destination.ip',
                    iocs: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip' }],
                  },
                },
              ],
              hunt_result: {
                ...huntResult,
                tier1: { ...huntResult.tier1, per_index_truncated: true },
              },
            }),
            { ...defaultNavigation, share }
          )}
        />
      );

      expect(getRedirectUrl).toHaveBeenCalledWith({
        query: { esql: expectedEsql },
        timeRange: huntResult.time_range,
        useHash: true,
      });
    });

    it('falls back to cited-event indices only when the hunt carried no per-index rows', () => {
      const { share, getRedirectUrl } = shareReturning('https://example.test/pivot');
      const eventIndex = '.ds-logs-endpoint.events.process-default-2026.09.22-000001';
      const expectedEsql = buildIocMatchEsql({
        indices: [eventIndex],
        field: 'destination.ip',
        value: '203.0.113.5',
        iocType: 'ip',
      });

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [iocDetection()],
              events: [
                {
                  event_id: 'evt-1',
                  source_index: eventIndex,
                  matched: {
                    field: 'destination.ip',
                    iocs: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip' }],
                  },
                },
              ],
              hunt_result: { ...huntResult, tier1: { ...huntResult.tier1, per_index: [] } },
            }),
            { ...defaultNavigation, share }
          )}
        />
      );

      expect(getRedirectUrl).toHaveBeenCalledWith({
        query: { esql: expectedEsql },
        timeRange: huntResult.time_range,
        useHash: true,
      });
    });

    it('withholds the IOC pivot when neither the hunt nor the cited events name an index', () => {
      const { share, getRedirectUrl } = shareReturning('https://example.test/pivot');

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [iocDetection()],
              events: [],
              hunt_result: { ...huntResult, tier1: { ...huntResult.tier1, per_index: [] } },
            }),
            { ...defaultNavigation, share }
          )}
        />
      );

      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      expect(whatMatched).toHaveTextContent('203.0.113.5');
      // The entity chips still resolve their own Discover links through share; the one call
      // that must never happen is the IOC pivot over the matched value.
      expect(getRedirectUrl).not.toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ esql: expect.stringContaining('203.0.113.5') }),
        })
      );
    });

    it('renders one date without a range separator when first_seen equals last_seen', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [
                iocDetection({
                  first_seen: '2026-07-30T13:05:00.000Z',
                  last_seen: '2026-07-30T13:05:00.000Z',
                }),
              ],
            })
          )}
        />
      );

      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      expect(whatMatched).not.toHaveTextContent('–');
    });

    it('notes a detection whose scope came from the sampled hits', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({ ...baseData, detections: [iocDetection({ from_sample: true })] })
          )}
        />
      );

      expect(
        within(screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).getByText(
          'From sampled hits'
        )
      ).toBeInTheDocument();
    });

    it('lists sample hosts under Scope when the detection carries them', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [
                iocDetection({
                  host_count: 4,
                  hosts: ['host-a', 'host-b', 'host-c', 'host-d'],
                  user_count: 2,
                  users: ['alice', 'bob'],
                }),
              ],
            })
          )}
        />
      );

      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      expect(whatMatched).toHaveTextContent('3 events');
      expect(whatMatched).toHaveTextContent('4 hosts');
      expect(whatMatched).toHaveTextContent('host-a, host-b, host-c +1 more');
      expect(whatMatched).toHaveTextContent('alice, bob');
    });

    it('falls back to the behavior title when technique_name is absent', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: huntResult,
              detections: [
                {
                  id: 'behavior:T1021',
                  kind: 'behavior',
                  technique_id: 'T1021',
                  basis: 'behavior_only',
                  matched_on: [],
                  total: 2,
                  host_count: 1,
                },
              ],
            })
          )}
        />
      );

      expect(
        within(screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).getByText(
          'Lateral movement via RDP'
        )
      ).toBeInTheDocument();
    });

    it('omits the Seen column when no detection carries first/last seen', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, detections: [iocDetection()] }))}
        />
      );

      expect(
        within(screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).queryByText('Seen')
      ).not.toBeInTheDocument();
    });

    it('shows the Seen column when a detection carries timestamps', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [
                iocDetection({
                  first_seen: '2024-01-01T00:00:00.000Z',
                  last_seen: '2024-01-01T12:00:00.000Z',
                }),
              ],
            })
          )}
        />
      );

      expect(
        within(screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).getByText('Seen')
      ).toBeInTheDocument();
    });
  });

  it('labels the hypothesis section "Hypothesis"', () => {
    renderWithI18n(
      <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
    );
    expect(screen.getByText('Hypothesis')).toBeInTheDocument();
    expect(screen.getByTestId('alertzeroSignificantSecurityEventHypothesis')).toHaveTextContent(
      'Attacker pivoted via RDP'
    );
    expect(screen.queryByText('Hypothesis tested')).not.toBeInTheDocument();
    expect(screen.queryByText('Why this matters')).not.toBeInTheDocument();
  });

  describe('queries run', () => {
    const behaviorAt = (
      index: number,
      extras: {
        technique_id?: string;
        confidence?: number;
        validated_esql?: string;
        execution?: {
          executed: boolean;
          row_count: number;
          hit: boolean;
          inconclusive_reason?: 'rows_unclassifiable' | 'execute_failed';
        };
      } = {}
    ): Tier2Behavior => ({
      technique_id: `T10${index}`,
      tactic_ids: ['TA0008'],
      confidence: 0.75,
      title: `Behavior ${index}`,
      ...extras,
    });

    const huntWithBehaviors = (behaviors: Tier2Behavior[]): HuntResultData => ({
      ...huntResult,
      // The schema ties Tier 2 as a confirming source to an executed hit.
      hit_sources: behaviors.some((behavior) => behavior.execution?.hit)
        ? ['tier1', 'tier2']
        : ['tier1'],
      tier2: { status: 'behaviors_proposed', behaviors },
    });

    const executableCount = (behaviors: Tier2Behavior[]): number =>
      behaviors.filter(
        (behavior) =>
          behavior.validated_esql != null && isExecutableHuntQuery(behavior.validated_esql)
      ).length;

    const renderOpen = async (
      behaviors: Tier2Behavior[],
      navigation: Parameters<typeof renderProps>[1] = defaultNavigation
    ) => {
      const user = userEvent.setup();
      const result = renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({ ...baseData, hunt_result: huntWithBehaviors(behaviors) }),
            navigation
          )}
        />
      );
      const accordion = screen.getByTestId(SSE_ATTACHMENT_QUERIES_RUN_TEST_ID);
      await user.click(
        within(accordion).getByRole('button', {
          name: `Queries run (${executableCount(behaviors)})`,
        })
      );
      return { user, accordion, ...result };
    };

    const techniqueLinks = () =>
      screen.queryAllByTestId(/^alertzeroSignificantSecurityEventHuntResultTechniqueLink-/);

    it('titles the accordion with the executable query count, excluding placeholders', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: huntWithBehaviors([
                behaviorAt(1, { validated_esql: EXECUTABLE_ESQL }),
                behaviorAt(2, { validated_esql: PLACEHOLDER_ESQL }),
              ]),
            })
          )}
        />
      );

      expect(
        within(screen.getByTestId(SSE_ATTACHMENT_QUERIES_RUN_TEST_ID)).getByRole('button', {
          name: 'Queries run (1)',
        })
      ).toBeInTheDocument();
    });

    it('keeps a non-executable placeholder out of the query rows and only in the summary line', async () => {
      await renderOpen([
        behaviorAt(1, { validated_esql: EXECUTABLE_ESQL }),
        behaviorAt(2, { validated_esql: PLACEHOLDER_ESQL }),
      ]);

      expect(techniqueLinks()).toHaveLength(1);
      expect(screen.getByText('T101')).toBeInTheDocument();
      expect(screen.queryByText('T102')).not.toBeInTheDocument();
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventQueriesRunNonExecutable')
      ).toHaveTextContent('1 behavior not run: 1 with an unrunnable query');
    });

    it('tells the behavior outcomes apart and surfaces their reasons', async () => {
      await renderOpen([
        behaviorAt(1, {
          validated_esql: EXECUTABLE_ESQL,
          execution: { executed: true, row_count: 4, hit: true },
        }),
        behaviorAt(2, {
          validated_esql: EXECUTABLE_ESQL,
          execution: { executed: true, row_count: 0, hit: false },
        }),
        behaviorAt(3, {
          validated_esql: EXECUTABLE_ESQL,
          execution: {
            executed: true,
            row_count: 4,
            hit: false,
            inconclusive_reason: 'rows_unclassifiable',
          },
        }),
        behaviorAt(4, {
          validated_esql: EXECUTABLE_ESQL,
          execution: {
            executed: false,
            row_count: 0,
            hit: false,
            inconclusive_reason: 'execute_failed',
          },
        }),
        behaviorAt(5, { validated_esql: EXECUTABLE_ESQL }),
      ]);

      expect(screen.getByText('Hit: 4 rows')).toBeInTheDocument();
      expect(screen.getByText('No rows')).toBeInTheDocument();
      expect(screen.getByText('Inconclusive')).toBeInTheDocument();
      expect(screen.getByText('rows_unclassifiable')).toBeInTheDocument();
      expect(screen.getByText('Not executed')).toBeInTheDocument();
      expect(screen.getByText('execute_failed')).toBeInTheDocument();
      expect(screen.getByText('Unreported')).toBeInTheDocument();
    });

    it('offers Copy and Open in Discover on a failed execution, with its reason', async () => {
      const { share } = shareReturning('https://example.test/open');
      await renderOpen(
        [
          behaviorAt(1, {
            validated_esql: EXECUTABLE_ESQL,
            execution: {
              executed: false,
              row_count: 0,
              hit: false,
              inconclusive_reason: 'execute_failed',
            },
          }),
        ],
        { ...defaultNavigation, share }
      );

      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventQueryCopy-0')
      ).toBeInTheDocument();
      const link = screen.getByTestId('alertzeroSignificantSecurityEventContinueInDiscover-0');
      expect(link).toHaveAttribute('aria-label', expect.stringMatching(/^Open in Discover: T101 /));
      expect(screen.getByText('execute_failed')).toBeInTheDocument();
    });

    it('offers Open in Discover for a reported-but-unexecuted behavior', async () => {
      const { share } = shareReturning('https://example.test/open');
      await renderOpen([behaviorAt(1, { validated_esql: EXECUTABLE_ESQL })], {
        ...defaultNavigation,
        share,
      });

      expect(screen.getByText('Unreported')).toBeInTheDocument();
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventContinueInDiscover-0')
      ).toHaveAttribute('aria-label', expect.stringMatching(/^Open in Discover: T101 /));
    });

    it('says Continue in Discover over the absolute hunt window for an executed row', async () => {
      const { share, getRedirectUrl } = shareReturning('https://example.test/continue');
      await renderOpen(
        [
          behaviorAt(1, {
            validated_esql: EXECUTABLE_ESQL,
            execution: { executed: true, row_count: 3, hit: true },
          }),
        ],
        { ...defaultNavigation, share }
      );

      const link = screen.getByTestId('alertzeroSignificantSecurityEventContinueInDiscover-0');
      expect(link).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/^Continue in Discover: T101 /)
      );
      expect(link).toHaveAttribute('href', 'https://example.test/continue');
      expect(link).toHaveAttribute('target', '_blank');
      expect(getRedirectUrl).toHaveBeenCalledWith({
        query: { esql: EXECUTABLE_ESQL },
        timeRange: huntResult.time_range,
        useHash: true,
      });
    });

    it('falls back to Copy plus a hint when the redirect exceeds the length cap', async () => {
      const { share } = shareReturning(`https://example.test/${'x'.repeat(9000)}`);
      await renderOpen(
        [
          behaviorAt(1, {
            validated_esql: EXECUTABLE_ESQL,
            execution: { executed: true, row_count: 1, hit: true },
          }),
        ],
        { ...defaultNavigation, share }
      );

      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventQueryCopy-0')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventQueryTooLong-0')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventContinueInDiscover-0')
      ).not.toBeInTheDocument();
    });

    it('shows a report match percent on query rows but not on the non-executable summary', async () => {
      await renderOpen([
        behaviorAt(1, { validated_esql: EXECUTABLE_ESQL }),
        behaviorAt(2, { validated_esql: PLACEHOLDER_ESQL }),
      ]);

      expect(screen.getByText('Match')).toBeInTheDocument();
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventQueriesRunNonExecutable')
      ).not.toHaveTextContent('%');
    });

    it('pages executable behaviors five at a time and offers 5, 10 and 25 rows', async () => {
      const { user } = await renderOpen(
        Array.from({ length: 7 }, (_, index) =>
          behaviorAt(index + 1, { validated_esql: EXECUTABLE_ESQL })
        )
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
      await renderOpen([
        behaviorAt(3, { validated_esql: EXECUTABLE_ESQL }),
        behaviorAt(1, { validated_esql: EXECUTABLE_ESQL }),
        behaviorAt(2, { validated_esql: EXECUTABLE_ESQL }),
      ]);

      expect(
        techniqueLinks().map((link) => link.getAttribute('data-test-subj')?.split('-').pop())
      ).toEqual(['T103', 'T101', 'T102']);
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
                tier2: { ...huntResult.tier2!, behaviors_truncated: true },
              },
            })
          )}
        />
      );

      const accordion = screen.getByTestId(SSE_ATTACHMENT_QUERIES_RUN_TEST_ID);
      await user.click(within(accordion).getByRole('button', { name: 'Queries run (0)' }));
      expect(
        within(accordion).getByTestId(
          'alertzeroSignificantSecurityEventHuntResultBehaviorsTruncated'
        )
      ).toBeInTheDocument();
    });

    it('never shows the raw ES|QL anywhere on the card', async () => {
      const { share } = shareReturning('https://example.test/continue');
      await renderOpen(
        [
          behaviorAt(1, {
            validated_esql: EXECUTABLE_ESQL,
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

  describe('cited evidence', () => {
    it('renders a Discover link for an event when share returns a URL, inside the collapsed accordion', async () => {
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

      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
      expect(within(accordion).getByRole('button', { name: '1 event' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      await user.click(within(accordion).getByRole('button', { name: '1 event' }));

      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-1')
      ).toHaveTextContent('evt-1');
      expect(screen.getByLabelText('Open event evt-1 in Discover')).toHaveAttribute(
        'href',
        expectedHref
      );
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

      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
      await user.click(within(accordion).getByRole('button', { name: '1 event' }));

      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-plain')
      ).toHaveTextContent('evt-plain');
      expect(screen.queryByLabelText(/Open event .* in Discover/)).not.toBeInTheDocument();
    });

    it('groups events under their detection with fields and a shown-of-total footer', async () => {
      const user = userEvent.setup();
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              detections: [
                {
                  id: 'ioc:ip:203.0.113.5',
                  kind: 'ioc',
                  field: 'destination.ip',
                  basis: 'ioc_strong',
                  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
                  total: 10,
                },
              ],
              events: [
                {
                  event_id: 'evt-grp',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                  fields: { 'process.name': 'psexec.exe' },
                  matched: {
                    field: 'destination.ip',
                    detection: 'ioc:ip:203.0.113.5',
                    ioc: { type: 'ip', value: '203.0.113.5' },
                  },
                },
              ],
            })
          )}
        />
      );

      const accordion = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
      await user.click(within(accordion).getByRole('button', { name: '1 event' }));

      expect(within(accordion).getByText('ip 203.0.113.5')).toBeInTheDocument();
      expect(within(accordion).getByText('process.name')).toBeInTheDocument();
      expect(within(accordion).getByText('psexec.exe', { exact: false })).toBeInTheDocument();
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventEventsGroupFooter')
      ).toHaveTextContent('1 shown of 10');
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
  });

  describe('layout', () => {
    const detailSections = [
      ['alertzeroSignificantSecurityEventCitedEvidence', '1 event'],
      [SSE_ATTACHMENT_QUERIES_RUN_TEST_ID, 'Queries run (0)'],
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

    it('starts with the detail sections collapsed', () => {
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

      await user.click(buttonFor(0));
      expect(buttonFor(0)).toHaveAttribute('aria-expanded', 'true');
      expect(buttonFor(1)).toHaveAttribute('aria-expanded', 'true');

      await user.click(buttonFor(1));
      expect(buttonFor(1)).toHaveAttribute('aria-expanded', 'false');
      expect(buttonFor(0)).toHaveAttribute('aria-expanded', 'true');
    });

    it('renders the run id in the status row, without a source report row', () => {
      renderWithDetails();

      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventTechnicalRunDetails')
      ).not.toBeInTheDocument();

      const statusRow = screen.getByTestId('alertzeroSignificantSecurityEventStatusRow');
      const audit = within(statusRow).getByTestId('alertzeroSignificantSecurityEventRunProvenance');
      expect(within(audit).getByTestId('alertzeroSignificantSecurityEventRunId')).toHaveTextContent(
        'run-1'
      );
      expect(
        within(audit).queryByTestId('alertzeroSignificantSecurityEventReportLink')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventSourceWatch')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventCapability')
      ).not.toBeInTheDocument();

      const hypothesis = screen.getByTestId('alertzeroSignificantSecurityEventHypothesis');
      expect(statusRow.compareDocumentPosition(hypothesis)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('links the run id to the managed workflow execution when getUrlForApp is available', () => {
      const getUrlForApp = jest
        .fn()
        .mockReturnValue(
          '/app/workflows/system-security-hunt-continuous-threat-hunt-default?tab=executions&executionId=run-1'
        );

      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment(baseData), {
            ...createMockNavigation(),
            getUrlForApp,
          })}
        />
      );

      const link = screen.getByTestId('alertzeroSignificantSecurityEventRunLink');
      expect(link).toHaveAttribute(
        'href',
        '/app/workflows/system-security-hunt-continuous-threat-hunt-default?tab=executions&executionId=run-1'
      );
      // The link is the tab stop; the value inside it must not add a second one.
      expect(screen.getByTestId('alertzeroSignificantSecurityEventRunId')).not.toHaveAttribute(
        'tabindex'
      );
      expect(getUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/watch-1-default?tab=executions&executionId=run-1',
      });
    });

    it('renders the run id in the status row even without a hunt result', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />
      );

      expect(
        within(screen.getByTestId('alertzeroSignificantSecurityEventStatusRow')).getByTestId(
          'alertzeroSignificantSecurityEventRunId'
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventHuntResultOutcome')
      ).not.toBeInTheDocument();
    });

    it('orders the story as status row, hypothesis, searched for, what matched, involved, hits, events, queries', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
              hunt_result: {
                ...huntResult,
                tier1: {
                  ...huntResult.tier1,
                  resolved_iocs: [{ type: 'ip', value: '203.0.113.5' }],
                },
              },
              detections: [
                {
                  id: 'ioc:ip:203.0.113.5',
                  kind: 'ioc',
                  field: 'destination.ip',
                  basis: 'ioc_strong',
                  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
                  total: 4,
                },
              ],
            })
          )}
        />
      );

      const statusRow = screen.getByTestId('alertzeroSignificantSecurityEventStatusRow');
      const outcome = screen.getByTestId('alertzeroSignificantSecurityEventHuntResultOutcome');
      const audit = screen.getByTestId('alertzeroSignificantSecurityEventRunProvenance');
      const hypothesis = screen.getByTestId('alertzeroSignificantSecurityEventHypothesis');
      const searchedFor = screen.getByTestId(SSE_ATTACHMENT_SEARCHED_FOR_TEST_ID);
      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      const entities = screen.getByTestId(SSE_ATTACHMENT_ENTITY_LINE_TEST_ID);
      const queries = screen.getByTestId(SSE_ATTACHMENT_QUERIES_RUN_TEST_ID);
      const events = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
      const indexHits = screen.getByTestId(SSE_ATTACHMENT_INDEX_HITS_TEST_ID);

      expect(
        within(statusRow).getByTestId('alertzeroSignificantSecurityEventHuntResultOutcome')
      ).toBe(outcome);
      expect(within(statusRow).getByTestId('alertzeroSignificantSecurityEventRunProvenance')).toBe(
        audit
      );
      expect(
        within(statusRow).getByTestId('alertzeroSignificantSecurityEventHuntWindow')
      ).toBeInTheDocument();
      expect(statusRow.compareDocumentPosition(hypothesis)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(hypothesis.compareDocumentPosition(searchedFor)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
      expect(searchedFor.compareDocumentPosition(whatMatched)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
      expect(whatMatched.compareDocumentPosition(entities)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(entities.compareDocumentPosition(indexHits)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(indexHits.compareDocumentPosition(events)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(events.compareDocumentPosition(queries)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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
  });

  describe('hits by index', () => {
    it('surfaces the per-index distribution above the events table', () => {
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

      const indexHits = screen.getByTestId(SSE_ATTACHMENT_INDEX_HITS_TEST_ID);
      expect(indexHits).toHaveTextContent('12 events across 2 indices');
      expect(indexHits).toHaveTextContent('logs-endpoint.events.network-default (4) optional');
      expect(screen.getAllByText('optional')).toHaveLength(1);

      const events = screen.getByTestId('alertzeroSignificantSecurityEventCitedEvidence');
      const entities = screen.getByTestId(SSE_ATTACHMENT_ENTITY_LINE_TEST_ID);
      expect(entities.compareDocumentPosition(indexHits)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(indexHits.compareDocumentPosition(events)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventTechnicalRunDetails')
      ).not.toBeInTheDocument();
    });

    it('omits the section when the hunt carried no per-index rows', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: { ...huntResult, tier1: { ...huntResult.tier1, per_index: [] } },
            })
          )}
        />
      );

      expect(screen.queryByTestId(SSE_ATTACHMENT_INDEX_HITS_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('run provenance and hunt outcome', () => {
    it('renders the hunt window on the status row', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(buildAttachment({ ...baseData, hunt_result: huntResult }))}
        />
      );
      expect(screen.getByTestId('alertzeroSignificantSecurityEventHuntWindow')).toHaveTextContent(
        '2024'
      );
    });

    it('hides the window, confirmed-hit badge and queries run without a hunt result', () => {
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

      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventHuntWindow')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventConfirmedHit')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId(SSE_ATTACHMENT_QUERIES_RUN_TEST_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SSE_ATTACHMENT_INDEX_HITS_TEST_ID)).not.toBeInTheDocument();
    });

    it('names the tier that confirmed the finding alongside the report-wide tier statuses', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                hit_sources: ['tier2'],
                tier2: {
                  status: 'behaviors_proposed',
                  behaviors: [
                    {
                      technique_id: 'T1021',
                      tactic_ids: ['TA0008'],
                      confidence: 0.75,
                      title: 'Lateral movement via RDP',
                      execution: { executed: true, row_count: 2, hit: true },
                    },
                  ],
                },
              },
            })
          )}
        />
      );

      const statusRow = screen.getByTestId('alertzeroSignificantSecurityEventStatusRow');
      const outcome = within(statusRow).getByTestId(
        'alertzeroSignificantSecurityEventHuntResultOutcome'
      );
      expect(
        within(outcome).getByTestId('alertzeroSignificantSecurityEventHuntResultHitSources')
      ).toHaveTextContent('Confirmed by Behavior Hunt');
      expect(outcome).toHaveTextContent('Environment hits found');
      expect(
        within(statusRow).getByTestId('alertzeroSignificantSecurityEventHuntWindow')
      ).toBeInTheDocument();
    });

    it('distinguishes a hunt that could not run from one that ran and found nothing', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                has_confirmed_hit: false,
                hit_sources: [],
                tier1: {
                  ...huntResult.tier1,
                  status: 'no_searchable_terms',
                  counts: {
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
                    { type: 'ip', value: '203.0.113.5' },
                    { type: 'hash', value: 'deadbeef' },
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

    it('falls back to a searched IOC count when the resolved list was dropped', () => {
      const { resolved_iocs: _omit, ...tier1WithoutResolved } = huntResult.tier1;
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: {
                ...huntResult,
                tier1: { ...tier1WithoutResolved, searched_ioc_count: 2 },
              },
            })
          )}
        />
      );

      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventHuntResultResolvedIocs')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventSearchedIocCount')
      ).toHaveTextContent('Searched 2 IOCs');
    });

    it('marks the lists the producer truncated, and leaves them unmarked otherwise', () => {
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
                  resolved_iocs: [{ type: 'ip', value: '203.0.113.5' }],
                  per_index_truncated: true,
                  resolved_iocs_truncated: true,
                },
                tier2: { ...huntResult.tier2!, behaviors_truncated: true },
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
                  resolved_iocs: [{ type: 'ip', value: '203.0.113.5' }],
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

  describe('old-payload adapter', () => {
    const { tier2: _baseTier2, ...tier1OnlyHunt } = huntResult;

    it('derives IOC detections for a v1 Tier-1-only payload', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: { ...tier1OnlyHunt, hit_sources: ['tier1'] },
              events: [
                {
                  event_id: 'evt-ioc',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                  matched: { field: 'destination.ip', ioc: { type: 'ip', value: '198.51.100.7' } },
                },
              ],
            })
          )}
        />
      );

      expect(screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID)).toHaveTextContent(
        '198.51.100.7'
      );
    });

    it('renders every derived IOC detection when a payload matched several', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: { ...tier1OnlyHunt, hit_sources: ['tier1'] },
              events: [
                {
                  event_id: 'evt-a',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                  matched: { field: 'destination.ip', ioc: { type: 'ip', value: '198.51.100.7' } },
                },
                {
                  event_id: 'evt-b',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                  matched: { field: 'file.hash.sha256', ioc: { type: 'hash', value: 'deadbeef' } },
                },
              ],
            })
          )}
        />
      );

      const whatMatched = screen.getByTestId(SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID);
      expect(whatMatched).toHaveTextContent('198.51.100.7');
      expect(whatMatched).toHaveTextContent('deadbeef');
    });

    it('derives a technique-scoped behavior detection', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              corroborated_technique_id: 'T1021',
              hunt_result: {
                ...huntResult,
                hit_sources: ['tier1', 'tier2'],
                tier2: {
                  status: 'behaviors_proposed',
                  behaviors: [
                    {
                      technique_id: 'T1021',
                      tactic_ids: ['TA0008'],
                      confidence: 0.75,
                      title: 'Lateral movement via RDP',
                      execution: { executed: true, row_count: 2, hit: true },
                    },
                    {
                      technique_id: 'T1078',
                      tactic_ids: ['TA0008'],
                      confidence: 0.6,
                      title: 'Valid accounts',
                      execution: { executed: true, row_count: 1, hit: true },
                    },
                  ],
                },
              },
            })
          )}
        />
      );

      expect(
        screen.getByTestId('alertzeroSignificantSecurityEventDetectionTechnique-T1021')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('alertzeroSignificantSecurityEventDetectionTechnique-T1078')
      ).not.toBeInTheDocument();
    });

    it('grades a loopback IOC event as a weak IOC basis', () => {
      renderWithI18n(
        <SignificantSecurityEventInlineContent
          {...renderProps(
            buildAttachment({
              ...baseData,
              hunt_result: { ...tier1OnlyHunt, hit_sources: ['tier1'] },
              events: [
                {
                  event_id: 'evt-loopback',
                  source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                  matched: { field: 'destination.ip', ioc: { type: 'ip', value: '127.0.0.1' } },
                },
              ],
            })
          )}
        />
      );

      expect(screen.getByTestId(SSE_ATTACHMENT_BASIS_TEST_ID)).toHaveTextContent('Weak IOC');
    });
  });
});
