/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  ThreatAttachmentInlineContent,
  THREAT_ATTACHMENT_EMPTY_TEST_ID,
  THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID,
  THREAT_EXTERNAL_REF_LINK_TEST_ID,
} from './threat_inline_content';
import { threatAttachmentQueryClient } from './query_client';
import type { ThreatAttachment } from './types';
import { buildDiscoverThreatReportNestedIocUrl, buildThreatReportLookupEsql } from '../navigation';

const buildAttachment = (data: ThreatAttachment['data']): ThreatAttachment =>
  ({ id: 'att-1', type: 'security.threat', data } as ThreatAttachment);

const mockShare = {
  url: {
    locators: {
      get: () => ({
        getRedirectUrl: (params: {
          query?: { esql?: string };
          filters?: unknown[];
        }) => {
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
  attachment: ThreatAttachment,
  http: HttpStart,
  navigation: typeof defaultNavigation & { share?: SharePluginStart } = defaultNavigation
) => ({
  attachment,
  http,
  navigation,
  isSidebar: false,
});

describe('ThreatAttachmentInlineContent', () => {
  // The module-scoped query client caches by `report_id`; clear it between tests so a prior
  // test's resolved/errored query state can't leak into the next one via the shared cache.
  // Retries are also disabled for the suite: the rejection tests would otherwise wait out
  // the client's `retry: 1` (~1s each) before the fallback path renders.
  beforeEach(() => {
    threatAttachmentQueryClient.setDefaultOptions({
      queries: { refetchOnWindowFocus: false, retry: 0, staleTime: 30_000 },
    });
  });

  afterEach(() => {
    threatAttachmentQueryClient.clear();
  });

  it('renders the empty state when the payload has no report_id', () => {
    const http = { fetch: jest.fn() } as unknown as HttpStart;
    const attachment = buildAttachment({} as ThreatAttachment['data']);
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);
    expect(screen.getByTestId(THREAT_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders the live report fields when the fetch resolves', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-1',
        content: { title: 'Live Title' },
        severity: { level: 'high', score: 0.9 },
        source: { name: 'Live Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-1' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Live Title')).toBeInTheDocument();
    });
    expect(screen.getByText('Live Source')).toBeInTheDocument();
    expect(screen.queryByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders enriched fields (iocs, ttps, diamond, evidence) when the live report has them', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-2',
        content: { title: 'Enriched Title' },
        severity: { level: 'high', score: 0.9 },
        source: { name: 'Enriched Source' },
        extracted: {
          iocs: [{ type: 'ip', value: '203.0.113.5', tier: 'high' }],
          ttps: { tactics: ['Initial Access'], techniques: ['T1078'] },
          categories: ['credential-access'],
          diamond: {
            adversary: { signal: 'aws-iam', summary: 'Adversary summary' },
            capability: { signal: 'assume-role-chaining', summary: 'Capability summary' },
            signal_count: 2,
            suitable: true,
          },
        },
        geography: { regions: ['us-east-1'] },
        evidence: {
          alert_hits_total: 5,
          last_hunt_status: 'completed',
          corroborated_rank_score: 0.71,
        },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-2' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Enriched Title')).toBeInTheDocument();
    });
    expect(screen.getByText('203.0.113.5 (high)')).toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
    expect(screen.getByText('T1078')).toBeInTheDocument();
    expect(screen.getByText('aws-iam')).toBeInTheDocument();
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
    expect(screen.getByText('credential-access')).toBeInTheDocument();
  });

  it('falls back to captured fields when the fetch fails (no status-code branching)', async () => {
    const http = {
      fetch: jest.fn().mockRejectedValue(new Error('403')),
    } as unknown as HttpStart;
    const attachment = buildAttachment({
      report_id: 'r-1',
      title: 'Captured Title',
      severity: 'medium',
      source: 'Captured Source',
    });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).toBeInTheDocument();
    });
    expect(screen.getByText('Captured Title')).toBeInTheDocument();
  });

  it('shows "Report unavailable" when neither live nor captured fields exist', async () => {
    const http = {
      fetch: jest.fn().mockRejectedValue(new Error('404')),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-1' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Report unavailable')).toBeInTheDocument();
    });
  });

  it('renders the report id as a Discover link when share is present', async () => {
    const reportId = 'r-discover';
    const expectedEsql = buildThreatReportLookupEsql({ reportId });
    const expectedHref = `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`;
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId,
        content: { title: 'Discover Title' },
        severity: { level: 'high' },
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: reportId });

    render(
      <ThreatAttachmentInlineContent
        {...renderProps(attachment, http, { ...defaultNavigation, share: mockShare })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Discover Title')).toBeInTheDocument();
    });

    const link = screen.getByTestId('alertzeroThreatAttachmentReportLink');
    expect(link).toHaveAttribute('href', expectedHref);
    expect(link).toHaveTextContent(reportId);
  });

  it('renders the report id as plain text when share is undefined', async () => {
    const reportId = 'r-plain';
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId,
        content: { title: 'Plain Title' },
        severity: { level: 'medium' },
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: reportId });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Plain Title')).toBeInTheDocument();
    });

    const node = screen.getByTestId('alertzeroThreatAttachmentReportLink');
    expect(node.tagName.toLowerCase()).toBe('span');
    expect(node).not.toHaveAttribute('href');
    expect(node).toHaveTextContent(reportId);
  });

  it('renders an IOC value as a nested threat-report Discover link', async () => {
    const iocValue = '198.51.100.10';
    const expectedHref = buildDiscoverThreatReportNestedIocUrl({
      share: mockShare,
      iocType: 'ipv4-addr',
      value: iocValue,
    });
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-ioc',
        content: { title: 'IOC Title' },
        severity: { level: 'high' },
        source: { name: 'Source' },
        extracted: {
          iocs: [{ type: 'ipv4-addr', value: iocValue }],
        },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ioc' });

    render(
      <ThreatAttachmentInlineContent
        {...renderProps(attachment, http, { ...defaultNavigation, share: mockShare })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('IOC Title')).toBeInTheDocument();
    });

    const link = screen.getByTestId('alertzeroThreatAttachmentIocLink-ipv4-addr-0');
    expect(link).toHaveAttribute('href', expectedHref);
    expect(link).toHaveTextContent(iocValue);
  });

  it('renders an external reference URL as an anchor', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-ext',
        content: {
          title: 'External Title',
          external_references: [
            {
              source_name: 'MITRE ATT&CK',
              url: 'https://attack.mitre.org/techniques/T1078/',
              external_id: 'T1078',
            },
          ],
        },
        severity: { level: 'high' },
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ext' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('External Title')).toBeInTheDocument();
    });

    const link = screen.getByTestId(THREAT_EXTERNAL_REF_LINK_TEST_ID);
    expect(link).toHaveAttribute('href', 'https://attack.mitre.org/techniques/T1078/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveTextContent('MITRE ATT&CK');
  });

  it('omits non-http(s) external reference URLs', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-ext-bad',
        content: {
          title: 'Unsafe External Title',
          external_references: [
            {
              source_name: 'Evil',
              url: 'javascript:alert(1)',
              external_id: 'evil',
            },
            {
              source_name: 'Safe',
              url: 'https://example.com/report',
              external_id: 'safe',
            },
          ],
        },
        severity: { level: 'high' },
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ext-bad' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Unsafe External Title')).toBeInTheDocument();
    });

    const links = screen.getAllByTestId(THREAT_EXTERNAL_REF_LINK_TEST_ID);
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/report');
    expect(links[0]).toHaveTextContent('Safe');
  });

  it('shows Alert hits label rather than alert_hits_total= for evidence', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-evidence',
        content: { title: 'Evidence Title' },
        severity: { level: 'high' },
        source: { name: 'Source' },
        evidence: {
          alert_hits_total: 5,
          last_hunt_status: 'completed',
          corroborated_rank_score: 0.71,
        },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-evidence' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Evidence Title')).toBeInTheDocument();
    });

    expect(screen.getByText('Alert hits')).toBeInTheDocument();
    expect(screen.queryByText(/alert_hits_total=/)).not.toBeInTheDocument();
  });
});
