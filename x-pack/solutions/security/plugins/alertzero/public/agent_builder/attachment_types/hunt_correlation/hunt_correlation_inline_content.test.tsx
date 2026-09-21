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
  HuntCorrelationInlineContent,
  HUNT_CORRELATION_ATTACHMENT_TEST_ID,
  HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID,
} from './hunt_correlation_inline_content';
import type { HuntCorrelationAttachment } from './types';
import {
  buildActorLookupEsql,
  buildThreatReportIocSetHashLookupEsql,
  buildThreatReportLookupEsql,
  buildThreatReportsInEsql,
} from '../navigation';

const buildAttachment = (data: HuntCorrelationAttachment['data']): HuntCorrelationAttachment =>
  ({ id: 'att-1', type: 'security.hunt_correlation', data } as HuntCorrelationAttachment);

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
  attachment: HuntCorrelationAttachment,
  navigation: typeof defaultNavigation & { share?: SharePluginStart } = defaultNavigation
) => ({
  attachment,
  navigation,
  isSidebar: false,
});

const baseData: HuntCorrelationAttachment['data'] = {
  anchors: [
    { kind: 'hash', value: 'abc123' },
    { kind: 'actor', value: 'APT-99' },
  ],
  diamond_scores: [{ vertex: 'infrastructure', related_report_id: 'report-2', score: 0.75 }],
  thresholds: { anchor_match: 0.9, diamond_vertex: 0.6 },
  self_match_excluded: true,
};

describe('HuntCorrelationInlineContent', () => {
  it('renders the empty state for malformed data', () => {
    render(
      <HuntCorrelationInlineContent
        {...renderProps(buildAttachment(undefined as unknown as HuntCorrelationAttachment['data']))}
      />
    );
    expect(screen.getByTestId(HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders anchors, diamond scores, and labeled thresholds from a valid payload', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.getByTestId(HUNT_CORRELATION_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('APT-99')).toBeInTheDocument();
    expect(screen.getByText('infrastructure')).toBeInTheDocument();
    expect(screen.getByText('report-2')).toBeInTheDocument();
    expect(screen.getByText('0.75')).toBeInTheDocument();
    expect(screen.getByText('Anchor match')).toBeInTheDocument();
    expect(screen.getByText('Diamond vertex')).toBeInTheDocument();
    expect(screen.getByText('0.9')).toBeInTheDocument();
    expect(screen.getByText('0.6')).toBeInTheDocument();
  });

  it('does not render the literal anchor_match= debug string', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.queryByText(/anchor_match=/)).not.toBeInTheDocument();
  });

  it('renders a hero summary with unique related report count', () => {
    const data: HuntCorrelationAttachment['data'] = {
      ...baseData,
      anchors: [
        { kind: 'hash', value: 'abc123' },
        { kind: 'actor', value: 'APT-99' },
        { kind: 'ioc_set_hash', value: 'set-hash-1' },
      ],
      diamond_scores: [
        { vertex: 'infrastructure', related_report_id: 'report-2', score: 0.75 },
        { vertex: 'adversary', related_report_id: 'report-3', score: 0.8 },
        { vertex: 'capability', related_report_id: 'report-2', score: 0.5 },
      ],
    };
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(data))} />);
    expect(screen.getByText('3 anchors · 2 related reports')).toBeInTheDocument();
  });

  it('renders related report id as a Discover link when share is present', () => {
    const reportId = 'report-2';
    const expectedEsql = buildThreatReportLookupEsql({ reportId });
    const expectedHref = `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`;

    render(
      <HuntCorrelationInlineContent
        {...renderProps(buildAttachment(baseData), { ...defaultNavigation, share: mockShare })}
      />
    );

    const link = screen.getByTestId(`alertzeroHuntCorrelationRelatedReportLink-${reportId}`);
    expect(link).toHaveAttribute('href', expectedHref);
    expect(link).toHaveTextContent(reportId);
  });

  it('renders related report id as plain text when share is undefined', () => {
    const reportId = 'report-2';
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);

    const node = screen.getByTestId(`alertzeroHuntCorrelationRelatedReportLink-${reportId}`);
    expect(node.tagName.toLowerCase()).toBe('span');
    expect(node).not.toHaveAttribute('href');
    expect(node).toHaveTextContent(reportId);
  });

  it('renders hash and ioc_set_hash anchors as Discover links when share is present', () => {
    const hashValue = 'abc123';
    const iocSetHashValue = 'set-hash-1';
    const relatedReportId = 'report-2';
    const data: HuntCorrelationAttachment['data'] = {
      ...baseData,
      anchors: [
        { kind: 'hash', value: hashValue },
        { kind: 'ioc_set_hash', value: iocSetHashValue },
        { kind: 'actor', value: 'APT-99' },
      ],
      diamond_scores: [
        { vertex: 'infrastructure', related_report_id: relatedReportId, score: 0.75 },
      ],
    };
    const hashEsql = buildThreatReportsInEsql({ reportIds: [relatedReportId] });
    const iocSetEsql = buildThreatReportIocSetHashLookupEsql({ value: iocSetHashValue });
    const actorEsql = buildActorLookupEsql({ value: 'APT-99' });

    render(
      <HuntCorrelationInlineContent
        {...renderProps(buildAttachment(data), { ...defaultNavigation, share: mockShare })}
      />
    );

    const hashLink = screen.getByTestId('alertzeroHuntCorrelationAnchorLink-hash-0');
    expect(hashLink).toHaveAttribute(
      'href',
      `https://example.test/discover?esql=${encodeURIComponent(hashEsql as string)}`
    );
    expect(hashLink).toHaveTextContent(hashValue);

    const iocSetLink = screen.getByTestId('alertzeroHuntCorrelationAnchorLink-ioc_set_hash-0');
    expect(iocSetLink).toHaveAttribute(
      'href',
      `https://example.test/discover?esql=${encodeURIComponent(iocSetEsql as string)}`
    );
    expect(iocSetLink).toHaveTextContent(iocSetHashValue);

    expect(
      screen.queryByTestId('alertzeroHuntCorrelationAnchorLink-actor-0')
    ).not.toBeInTheDocument();
    const actorLink = screen.getByTestId('alertzeroHuntCorrelationActorChip-0');
    expect(actorLink).toHaveAttribute(
      'href',
      `https://example.test/discover?esql=${encodeURIComponent(actorEsql as string)}`
    );
    expect(actorLink).toHaveTextContent('APT-99');
    expect(screen.queryByText('Actor')).not.toBeInTheDocument();
  });

  it('drops malformed anchor entries but keeps the valid ones', () => {
    const data = {
      ...baseData,
      anchors: [
        { kind: 'hash', value: 'valid-anchor' },
        { kind: 'hash' },
        { value: 'missing-kind' },
      ] as unknown as HuntCorrelationAttachment['data']['anchors'],
    };
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(data))} />);
    expect(screen.getByText('valid-anchor')).toBeInTheDocument();
    expect(screen.queryByText('missing-kind')).not.toBeInTheDocument();
  });

  it('shows the empty-anchors sentinel when anchors is empty', () => {
    render(
      <HuntCorrelationInlineContent
        {...renderProps(buildAttachment({ ...baseData, anchors: [] }))}
      />
    );
    expect(screen.getByText('No anchors recorded')).toBeInTheDocument();
  });

  it('shows the empty-diamond-scores sentinel when diamond_scores is empty', () => {
    render(
      <HuntCorrelationInlineContent
        {...renderProps(buildAttachment({ ...baseData, diamond_scores: [] }))}
      />
    );
    expect(screen.getByText('No diamond scores recorded')).toBeInTheDocument();
  });
});
