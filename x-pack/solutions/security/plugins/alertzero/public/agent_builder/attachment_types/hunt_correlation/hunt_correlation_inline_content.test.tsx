/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  HuntCorrelationInlineContent,
  HUNT_CORRELATION_ATTACHMENT_TEST_ID,
  HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID,
} from './hunt_correlation_inline_content';
import type { HuntCorrelationAttachment } from './types';
import {
  buildActorLookupEsql,
  buildDiscoverThreatReportNestedIocUrl,
  buildThreatReportIocSetHashLookupEsql,
  buildThreatReportLookupEsql,
} from '../navigation';

const buildAttachment = (data: HuntCorrelationAttachment['data']): HuntCorrelationAttachment =>
  ({ id: 'att-1', type: 'security.hunt_correlation', data } as HuntCorrelationAttachment);

const mockShare = {
  url: {
    locators: {
      get: () => ({
        getRedirectUrl: (params: { query?: { esql?: string }; filters?: unknown[] }) => {
          if (params.query?.esql) {
            return `https://example.test/discover?esql=${encodeURIComponent(params.query.esql)}`;
          }
          if (params.filters) {
            return `https://example.test/discover?nested=${encodeURIComponent(
              JSON.stringify(params.filters)
            )}`;
          }
          return 'https://example.test/discover';
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

  it('renders anchors and diamond scores from a valid payload', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.getByTestId(HUNT_CORRELATION_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('APT-99')).toBeInTheDocument();
    expect(screen.getByText('report-2')).toBeInTheDocument();
  });

  it('does not render the hero summary line (it moved to the header subtitle)', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.queryByText(/anchors? .* related reports?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anchor/i, { selector: 'strong' })).toBeInTheDocument();
  });

  it('does not render the trailing thresholds description list', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.queryByText('Anchor match')).not.toBeInTheDocument();
    expect(screen.queryByText('Diamond vertex')).not.toBeInTheDocument();
  });

  it('shows an anchor match threshold tooltip next to the Anchors heading', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.getByText('Anchor match threshold 0.9')).toBeInTheDocument();
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

    const badgeWrapper = screen.getByTestId(
      `alertzeroHuntCorrelationRelatedReportLink-${reportId}`
    );
    expect(badgeWrapper).toHaveTextContent(reportId);
    const badge = badgeWrapper.querySelector('.euiBadge');
    expect(badge).not.toBeNull();
    fireEvent.mouseEnter(badge as Element);
    const discoverAction = screen.getByLabelText('Open in Discover');
    const openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(discoverAction);
    expect(openWindowSpy).toHaveBeenCalledWith(expectedHref, '_blank', 'noopener,noreferrer');
    openWindowSpy.mockRestore();
  });

  it('renders related report id with no Discover action when share is undefined', () => {
    const reportId = 'report-2';
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);

    const badgeWrapper = screen.getByTestId(
      `alertzeroHuntCorrelationRelatedReportLink-${reportId}`
    );
    expect(badgeWrapper).toHaveTextContent(reportId);
    const badge = badgeWrapper.querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.queryByLabelText('Open in Discover')).not.toBeInTheDocument();
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
    const expectedHashHref = buildDiscoverThreatReportNestedIocUrl({
      share: mockShare,
      iocType: 'hash',
      value: hashValue,
    });
    const iocSetEsql = buildThreatReportIocSetHashLookupEsql({ value: iocSetHashValue });
    const actorEsql = buildActorLookupEsql({ value: 'APT-99' });
    const expectedIocSetHref = `https://example.test/discover?esql=${encodeURIComponent(
      iocSetEsql as string
    )}`;

    render(
      <HuntCorrelationInlineContent
        {...renderProps(buildAttachment(data), { ...defaultNavigation, share: mockShare })}
      />
    );

    const openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    const hashWrapper = screen.getByTestId('alertzeroHuntCorrelationAnchorLink-hash-0');
    expect(hashWrapper).toHaveTextContent(hashValue);
    const hashBadge = hashWrapper.querySelector('.euiBadge');
    expect(hashBadge).not.toBeNull();
    fireEvent.mouseEnter(hashBadge as Element);
    fireEvent.click(screen.getByLabelText('Open in Discover'));
    expect(openWindowSpy).toHaveBeenCalledWith(expectedHashHref, '_blank', 'noopener,noreferrer');
    fireEvent.mouseLeave(hashBadge as Element);

    const iocSetWrapper = screen.getByTestId('alertzeroHuntCorrelationAnchorLink-ioc_set_hash-0');
    expect(iocSetWrapper).toHaveTextContent(iocSetHashValue);
    const iocSetBadge = iocSetWrapper.querySelector('.euiBadge');
    expect(iocSetBadge).not.toBeNull();
    fireEvent.mouseEnter(iocSetBadge as Element);
    fireEvent.click(screen.getByLabelText('Open in Discover'));
    expect(openWindowSpy).toHaveBeenCalledWith(expectedIocSetHref, '_blank', 'noopener,noreferrer');
    fireEvent.mouseLeave(iocSetBadge as Element);

    expect(
      screen.queryByTestId('alertzeroHuntCorrelationAnchorLink-actor-0')
    ).not.toBeInTheDocument();
    const actorLink = screen.getByTestId('alertzeroHuntCorrelationActorChip-0');
    expect(actorLink).toHaveTextContent('APT-99');
    const actorBadge = actorLink.querySelector('.euiBadge');
    expect(actorBadge).not.toBeNull();
    fireEvent.mouseEnter(actorBadge as Element);
    fireEvent.click(screen.getByLabelText('Open in Discover'));
    expect(openWindowSpy).toHaveBeenCalledWith(
      `https://example.test/discover?esql=${encodeURIComponent(actorEsql as string)}`,
      '_blank',
      'noopener,noreferrer'
    );

    openWindowSpy.mockRestore();
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

  it('groups diamond scores for the same related report into a single row', () => {
    const data: HuntCorrelationAttachment['data'] = {
      ...baseData,
      diamond_scores: [
        { vertex: 'infrastructure', related_report_id: 'report-2', score: 0.75 },
        { vertex: 'capability', related_report_id: 'report-2', score: 0.5 },
        { vertex: 'adversary', related_report_id: 'report-3', score: 0.8 },
      ],
    };
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(data))} />);

    // One row per distinct related_report_id, not one row per score.
    expect(
      screen.getAllByTestId('alertzeroHuntCorrelationRelatedReportLink-report-2')
    ).toHaveLength(1);
    expect(
      screen.getAllByTestId('alertzeroHuntCorrelationRelatedReportLink-report-3')
    ).toHaveLength(1);
  });

  it('shows an n/a cell for a vertex with no score for a given report', () => {
    const data: HuntCorrelationAttachment['data'] = {
      ...baseData,
      diamond_scores: [{ vertex: 'infrastructure', related_report_id: 'report-2', score: 0.75 }],
    };
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(data))} />);
    // adversary, capability, victim all have no score for report-2.
    expect(screen.getAllByText('n/a')).toHaveLength(3);
  });

  it('shows a vertex threshold tooltip on the diamond score column headers', () => {
    render(<HuntCorrelationInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.getAllByText('Threshold 0.6').length).toBeGreaterThan(0);
  });
});
