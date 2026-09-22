/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
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
import { buildDiscoverThreatReportNestedIocUrl } from '../navigation';

const buildAttachment = (data: ThreatAttachment['data']): ThreatAttachment =>
  ({ id: 'att-1', type: 'security.threat', data } as ThreatAttachment);

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

  it('renders a Rank stat from the live severity score once the fetch resolves', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-1',
        content: { title: 'Live Title' },
        severity: { level: 'high', score: 90 },
        source: { name: 'Live Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-1' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders enriched fields (iocs, ttps, diamond, evidence) when the live report has them', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-2',
        content: { title: 'Enriched Title' },
        severity: { level: 'high', score: 90 },
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
      expect(screen.getByText('90')).toBeInTheDocument();
    });
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.5')).toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
    expect(screen.getByText('T1078')).toBeInTheDocument();
    expect(screen.getByText('aws-iam')).toBeInTheDocument();
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
    expect(screen.getByText('credential-access')).toBeInTheDocument();

    // Diamond model overview badges (no more "signal_count=…, suitable=…" caption text).
    expect(screen.getByText('2 signals')).toBeInTheDocument();
    expect(screen.getByText('Suitable')).toBeInTheDocument();

    // Evidence stats and MITRE technique link.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Alert hits')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('Last hunt status')).toBeInTheDocument();
    expect(screen.getByText('0.71')).toBeInTheDocument();
    expect(screen.getByText('Corroborated rank')).toBeInTheDocument();

    const techniqueLink = screen.getByText('T1078').closest('a');
    expect(techniqueLink).toHaveAttribute('href', 'https://attack.mitre.org/techniques/T1078/');
    expect(techniqueLink).toHaveAttribute('target', '_blank');
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
    // Captured fields no longer render inline (title/severity/source/report id moved to the
    // header); the fallback callout is the observable signal that the live fetch failed.
    expect(screen.getByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).toBeInTheDocument();
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
        severity: { level: 'high', score: 80 },
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
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
    });

    const wrapper = screen.getByTestId('alertzeroThreatAttachmentIocLink-ipv4-addr-0');
    expect(wrapper).toHaveTextContent(iocValue);

    const badge = wrapper.querySelector('.euiBadge');
    expect(badge).not.toBeNull();
    fireEvent.mouseEnter(badge as Element);
    const openInDiscover = screen.getByLabelText('Open in Discover');
    expect(openInDiscover).toBeInTheDocument();
    const openWindowSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(openInDiscover);
    expect(openWindowSpy).toHaveBeenCalledWith(expectedHref, '_blank', 'noopener,noreferrer');
    openWindowSpy.mockRestore();
  });

  it('collapses IOCs of the same type beyond the visible limit behind a "+N more" badge', async () => {
    const iocs = Array.from({ length: 10 }, (_, index) => ({
      type: 'ipv4-addr',
      value: `203.0.113.${index}`,
    }));
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-overflow',
        content: { title: 'Overflow Title' },
        severity: { level: 'high', score: 60 },
        source: { name: 'Source' },
        extracted: { iocs },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-overflow' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId('alertzeroThreatAttachmentIocLink-ipv4-addr-0')).toBeInTheDocument();
    expect(screen.getByTestId('alertzeroThreatAttachmentIocLink-ipv4-addr-7')).toBeInTheDocument();
    expect(
      screen.queryByTestId('alertzeroThreatAttachmentIocLink-ipv4-addr-8')
    ).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
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
        severity: { level: 'high', score: 70 },
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ext' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
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
              url: ['javascript', 'alert(1)'].join(':'),
              external_id: 'evil',
            },
            {
              source_name: 'Safe',
              url: 'https://example.com/report',
              external_id: 'safe',
            },
          ],
        },
        severity: { level: 'high', score: 65 },
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ext-bad' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
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
        severity: { level: 'high', score: 55 },
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
      expect(screen.getByText('55')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Alert hits')).toBeInTheDocument();
    expect(screen.queryByText(/alert_hits_total=/)).not.toBeInTheDocument();
  });

  it('shows a relative "Last hunted" stat when lastHuntedAt is present', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-last-hunted',
        content: { title: 'Last Hunted Title' },
        severity: { level: 'high', score: 45 },
        source: { name: 'Source' },
        evidence: {
          last_hunted_at: new Date().toISOString(),
        },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-last-hunted' });

    render(
      <I18nProvider>
        <ThreatAttachmentInlineContent {...renderProps(attachment, http)} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Last hunted')).toBeInTheDocument();
  });

  it('renders regions and categories as description-list badge groups', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-geo',
        content: { title: 'Geo Title' },
        severity: { level: 'high', score: 35 },
        source: { name: 'Source' },
        extracted: { categories: ['exfiltration'] },
        geography: { regions: ['eu-west-1'] },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-geo' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Regions')).toBeInTheDocument();
    expect(screen.getByText('eu-west-1')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('exfiltration')).toBeInTheDocument();
  });
});
