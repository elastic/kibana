/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  SignificantSecurityEventInlineContent,
  SSE_ATTACHMENT_TEST_ID,
  SSE_ATTACHMENT_EMPTY_TEST_ID,
} from './significant_security_event_inline_content';
import type { SignificantSecurityEventAttachment } from './types';
import { buildEntityLookupEsql, buildEventLookupEsql, getAlertsIndex } from '../navigation';

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
        getRedirectUrl: ({ query }: { query: { esql: string } }) =>
          `https://example.test/discover?esql=${encodeURIComponent(query.esql)}`,
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

const baseData = {
  title: 'Suspicious lateral movement',
  severity: 'high' as const,
  confidence: 0.8,
  status: 'open',
  source_watch: 'watch-1',
  capability: 'lateral-movement-detector',
  run_id: 'run-1',
  security_knowledge_indicators: [{ type: 'hash', value: 'abc123' }],
  entities: ['host.name: host-1', 'user.name: user-1'],
  timeline: [{ at: '2024-01-01T00:00:00Z', what: 'RDP session opened' }],
  hypothesis_tested: 'Attacker pivoted via RDP',
  evidence_for: ['e1', 'e2'],
  evidence_against: [],
  evaluation_record_ref: 'eval-1',
};

describe('SignificantSecurityEventInlineContent', () => {
  it('renders the empty state for malformed data', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({} as SignificantSecurityEventAttachment['data']))}
      />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders every field from a valid payload', () => {
    render(<SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.getByTestId(SSE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Suspicious lateral movement')).toBeInTheDocument();
    expect(screen.getByText('high (0.8)')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('watch-1 · lateral-movement-detector · run-1')).toBeInTheDocument();
    expect(screen.getByText('Attacker pivoted via RDP')).toBeInTheDocument();
    expect(screen.getByText('RDP session opened')).toBeInTheDocument();
    expect(screen.getByText('host-1')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(
      screen.getByText('Evidence for: 2 · Evidence against: 0 · Indicators: 1')
    ).toBeInTheDocument();
  });

  it('drops malformed timeline entries but still renders the valid ones', () => {
    const data = {
      ...baseData,
      timeline: [
        { at: '2024-01-01T00:00:00Z', what: 'valid entry' },
        { at: 123, what: 'bad at type' },
        { what: 'missing at' },
      ] as unknown as SignificantSecurityEventAttachment['data']['timeline'],
    };
    render(<SignificantSecurityEventInlineContent {...renderProps(buildAttachment(data))} />);
    expect(screen.getByText('valid entry')).toBeInTheDocument();
    expect(screen.queryByText('bad at type')).not.toBeInTheDocument();
    expect(screen.queryByText('missing at')).not.toBeInTheDocument();
  });

  it('shows the empty-timeline sentinel when there are no entries', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, timeline: [] }))}
      />
    );
    expect(screen.getByText('No timeline entries recorded')).toBeInTheDocument();
  });

  it('shows the no-entities sentinel when entities is empty', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, entities: [] }))}
      />
    );
    expect(screen.getByText('No entities recorded')).toBeInTheDocument();
  });

  it('renders entity names as Discover links without kind badges', () => {
    const entities = [
      'entity:generic:arn:aws:iam::123456789012:user/dev-user',
      'entity:generic:arn:aws:iam::123456789012:role/escalated-role',
      'entity:generic:host:ci-deploy-runner-07',
    ];
    const userEsql = buildEntityLookupEsql({ kind: 'user', value: 'dev-user' });
    const roleEsql = buildEntityLookupEsql({ kind: 'role', value: 'escalated-role' });
    const hostEsql = buildEntityLookupEsql({ kind: 'host', value: 'ci-deploy-runner-07' });

    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, entities }), {
          ...defaultNavigation,
          share: mockShare,
        })}
      />
    );

    const userLink = screen.getByTestId('alertzeroSignificantSecurityEventEntity-0');
    expect(userLink).toHaveAttribute(
      'href',
      `https://example.test/discover?esql=${encodeURIComponent(userEsql as string)}`
    );
    expect(userLink).toHaveTextContent('dev-user');

    const roleLink = screen.getByTestId('alertzeroSignificantSecurityEventEntity-1');
    expect(roleLink).toHaveAttribute(
      'href',
      `https://example.test/discover?esql=${encodeURIComponent(roleEsql as string)}`
    );
    expect(roleLink).toHaveTextContent('escalated-role');

    const hostLink = screen.getByTestId('alertzeroSignificantSecurityEventEntity-2');
    expect(hostLink).toHaveAttribute(
      'href',
      `https://example.test/discover?esql=${encodeURIComponent(hostEsql as string)}`
    );
    expect(hostLink).toHaveTextContent('ci-deploy-runner-07');

    expect(screen.queryByText('User')).not.toBeInTheDocument();
    expect(screen.queryByText('Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Host')).not.toBeInTheDocument();
    expect(
      screen.queryByText('entity:generic:arn:aws:iam::123456789012:user/dev-user')
    ).not.toBeInTheDocument();
  });

  it('renders a Discover link for an event when share returns a URL', () => {
    const event = {
      event_id: 'evt-1',
      source_index: 'logs-endpoint.events.process-default',
    };
    const expectedEsql = buildEventLookupEsql({
      index: event.source_index,
      eventId: event.event_id,
    });
    const expectedHref = `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`;

    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, events: [event] }), {
          ...defaultNavigation,
          share: mockShare,
        })}
      />
    );

    const link = screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-1');
    expect(link).toHaveAttribute('href', expectedHref);
  });

  it('renders plain event text when share is undefined', () => {
    const event = {
      event_id: 'evt-plain',
      source_index: 'logs-endpoint.events.process-default',
    };

    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, events: [event] }))}
      />
    );

    const node = screen.getByTestId('alertzeroSignificantSecurityEventEventLink-evt-plain');
    expect(node.tagName.toLowerCase()).toBe('span');
    expect(node).not.toHaveAttribute('href');
    expect(node).toHaveTextContent('evt-plain');
  });

  it('renders a Security alert-details link for an alert id', () => {
    const alertId = 'alert-abc';
    const alertsIndex = getAlertsIndex('default');

    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, alerts: [alertId] }))}
      />
    );

    const link = screen.getByTestId(`alertzeroSignificantSecurityEventAlertLink-${alertId}`);
    expect(link).toHaveAttribute('href', expect.stringContaining('/app/security/alerts/redirect/'));
    expect(link).toHaveAttribute('href', expect.stringContaining(alertId));
    expect(link).toHaveAttribute('href', expect.stringContaining(`index=${alertsIndex}`));
    expect(link.getAttribute('href')).not.toContain('timestamp=');
  });

  it('renders evidence bullet text from evidence_for', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            evidence_for: ['Suspicious RDP from unusual host'],
            evidence_against: ['No outbound C2 observed'],
          })
        )}
      />
    );

    expect(screen.getByText('Suspicious RDP from unusual host')).toBeInTheDocument();
    expect(screen.getByText('No outbound C2 observed')).toBeInTheDocument();
  });

  it('renders a truncation callout when truncated is true', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(
          buildAttachment({
            ...baseData,
            truncated: true,
            truncated_original_count: 42,
          })
        )}
      />
    );

    expect(screen.getByTestId('alertzeroSignificantSecurityEventTruncation')).toBeInTheDocument();
  });
});
