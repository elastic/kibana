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
import {
  ThreatAttachmentInlineContent,
  THREAT_ATTACHMENT_EMPTY_TEST_ID,
  THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID,
  THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID,
  THREAT_EXTERNAL_REF_LINK_TEST_ID,
} from './threat_inline_content';
import { threatAttachmentQueryClient } from './query_client';
import type { ThreatAttachment } from './types';
import { buildDiscoverThreatReportNestedIocUrl } from '../navigation';
import { buildAttachment as buildAttachmentGeneric, createMockShare } from '../test_utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';

const buildAttachment = (data: ThreatAttachment['data']): ThreatAttachment =>
  buildAttachmentGeneric('security.threat', data);

const mockShare = createMockShare();

const defaultNavigation = {
  spaceId: 'default',
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

  it('still resolves the live report when a captured fallback field is unusable', async () => {
    // A persisted `severity` outside the current enum (or any other stale captured value) must
    // not invalidate the reference: `report_id` is usable, so the live fetch has to run rather
    // than the card reporting no reference at all.
    const http = {
      fetch: jest.fn().mockResolvedValue({ reportId: 'r-1', content: { title: 'Live Title' } }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({
      report_id: 'r-1',
      severity: 'informational',
    } as unknown as ThreatAttachment['data']);
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Live Title')).toBeInTheDocument();
    });
    expect(http.fetch).toHaveBeenCalled();
    expect(screen.queryByTestId(THREAT_ATTACHMENT_EMPTY_TEST_ID)).not.toBeInTheDocument();
  });

  it('ignores wrong-typed captured fields on the fallback path', async () => {
    // The reference is valid, the fetch fails, and the captured fields are unusable: the card
    // reports the report as unavailable rather than handing React a non-child.
    const http = {
      fetch: jest.fn().mockRejectedValue(new Error('404')),
    } as unknown as HttpStart;
    const attachment = buildAttachment({
      report_id: 'r-1',
      title: { bad: 'object' },
      source: 42,
    } as unknown as ThreatAttachment['data']);
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).toBeInTheDocument();
    });
    expect(screen.queryByTestId(THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(THREAT_ATTACHMENT_EMPTY_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders a Rank stat from the live severity score once the fetch resolves', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-1',
        content: { title: 'Live Title' },
        severity: { level: 'high' },
        rank_score: 90,
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
        severity: { level: 'high' },
        rank_score: 90,
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

  it('renders without crashing when the live response has malformed (non-array) fields', async () => {
    // The threat-report route validates only `reportId` and spreads the stored document
    // through, so array fields can arrive as non-arrays. A 200 with a malformed shape must
    // degrade to "nothing to show" for those sections, not throw in a `.filter`/`.map`.
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-malformed',
        content: { title: 'Malformed Title', external_references: { not: 'an array' } },
        severity: { level: 'high' },
        source: { name: 'Malformed Source' },
        rank_score: 10,
        extracted: {
          iocs: 'not-an-array',
          ttps: { tactics: 'not-an-array', techniques: {} },
          categories: 42,
        },
        geography: { regions: 'not-an-array' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-malformed' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    // Live path still renders the headline and rank, proving we took the success branch...
    await waitFor(() => {
      expect(screen.getByText('Malformed Title')).toBeInTheDocument();
    });
    expect(screen.getByText('10')).toBeInTheDocument();
    // ...and the malformed collections are simply absent, not a thrown render.
    expect(screen.queryByText('Indicators')).not.toBeInTheDocument();
    expect(screen.queryByText('External references')).not.toBeInTheDocument();
    expect(screen.queryByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('drops malformed members while still rendering the valid ones', async () => {
    // Guarding the container is not enough: the route does not validate member shapes either,
    // so `[null]` throws at `ref.url` / `ioc.type`, and an object where a string is expected
    // reaches React as a non-child. Valid siblings must survive the bad members.
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-members',
        content: {
          title: 'Mixed Title',
          external_references: [
            null,
            'not-an-object',
            { source_name: { bad: 'object' }, url: 'https://refs.example/unnamed' },
            { source_name: 'Good Ref', url: 'https://refs.example/named' },
          ],
        },
        extracted: {
          iocs: [null, 'not-an-object', { type: 'domain', value: 'good.example' }],
          ttps: { tactics: [null, 'Initial Access'], techniques: [{ bad: 'object' }, 'T1078'] },
          categories: [null, 'malware'],
        },
        geography: { regions: [42, 'EU'] },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-members' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Mixed Title')).toBeInTheDocument();
    });

    // Both well-formed references survive; the two unusable members are gone. The reference
    // whose `source_name` is an object falls back to its URL rather than rendering the object.
    expect(screen.getAllByTestId(THREAT_EXTERNAL_REF_LINK_TEST_ID)).toHaveLength(2);
    expect(screen.getByText('Good Ref')).toBeInTheDocument();
    expect(screen.getByText('https://refs.example/unnamed')).toBeInTheDocument();

    // One usable IOC, and the string lists keep only their string members.
    expect(screen.getByText('good.example')).toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
    expect(screen.getByText('T1078')).toBeInTheDocument();
    expect(screen.getByText('malware')).toBeInTheDocument();
    expect(screen.getByText('EU')).toBeInTheDocument();

    expect(screen.queryByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('omits malformed scalar fields instead of crashing the whole report', async () => {
    // Scalars are unvalidated for the same reason the collections are. An object where a string
    // is expected reaches React as a non-child, and `signal.toLowerCase()` throws outright, so
    // one bad scalar could take down a report whose other sections are perfectly usable.
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-scalars',
        content: { title: { bad: 'object' } },
        severity: { level: ['high'] },
        source: { name: 42 },
        rank_score: { bad: 'object' },
        evidence: {
          alert_hits_total: {},
          last_hunt_status: { bad: 'object' },
          last_hunted_at: {},
          corroborated_rank_score: 'not-a-number',
        },
        extracted: {
          diamond: {
            adversary: { signal: { bad: 'object' }, summary: 42 },
            signal_count: 'not-a-number',
            suitable: 'false',
          },
          categories: ['malware'],
        },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-scalars' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    // The one usable section renders, which is only reachable if nothing above it threw.
    await waitFor(() => {
      expect(screen.getByText('malware')).toBeInTheDocument();
    });

    // Every malformed scalar reads as absent: the headline has no usable field left, and the
    // diamond vertex survives with no signal rather than throwing on `toLowerCase`.
    expect(screen.queryByTestId('alertzeroThreatAttachmentHeadline')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertzeroThreatAttachmentDiamond-adversary')).toBeInTheDocument();
    expect(screen.queryByTestId('alertzeroThreatAttachmentEvidenceTable')).not.toBeInTheDocument();

    // `suitable` needs the same treatment even though it only picks between two labels: the
    // string 'false' is truthy, so coercing it would badge an unsuitable report as suitable.
    expect(screen.queryByText('Suitable')).not.toBeInTheDocument();
    expect(screen.queryByText('Not suitable')).not.toBeInTheDocument();

    // A live report was returned, so this is not the fetch-failed fallback.
    expect(screen.queryByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('falls back to captured fields when the live report resolves with nothing to show', async () => {
    // A 200 carrying only `reportId` is a valid response — a report seeded but not yet
    // enriched looks exactly like this. Every live section renders as null, so treating the
    // fetch as a success would leave an empty panel where the captured fields should be.
    const http = {
      fetch: jest.fn().mockResolvedValue({ reportId: 'r-sparse' }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({
      report_id: 'r-sparse',
      title: 'Captured Title',
      source: 'Captured Source',
    });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByTestId(THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID)).toBeInTheDocument();
    });
    expect(screen.getByText('Captured Title')).toBeInTheDocument();
    expect(screen.getByText('Captured Source')).toBeInTheDocument();

    // The report resolved, so the callout does not claim it could not be resolved.
    expect(screen.getByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).toHaveTextContent(
      'no details to show yet'
    );
  });

  it('falls back to captured fields when the report cannot be reached', async () => {
    const http = {
      fetch: jest.fn().mockRejectedValue({ response: { status: 503 } }),
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
    // The captured snapshot is the only view of the report when the live fetch fails, and the
    // chrome header is absent whenever there is no Discover action, so render it inline.
    const captured = screen.getByTestId(THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID);
    expect(captured).toHaveTextContent('Captured Title');
    expect(captured).toHaveTextContent('medium');
    expect(captured).toHaveTextContent('Captured Source');
  });

  it.each([
    ['response.status', { response: { status: 403 } }],
    ['body.statusCode', { body: { statusCode: 403, message: 'Forbidden' } }],
  ])('withholds the captured fields when the read is denied via %s', async (_label, rejection) => {
    const http = { fetch: jest.fn().mockRejectedValue(rejection) } as unknown as HttpStart;
    const attachment = buildAttachment({
      report_id: 'r-1',
      title: 'Captured Title',
      severity: 'medium',
      source: 'Captured Source',
    });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).toHaveTextContent(
        'do not have access'
      );
    });
    // A denial is the one failure that does not fall through to the snapshot: the route enforces
    // report access and the snapshot does not, so it must not stand in for a refused read.
    expect(screen.queryByTestId(THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByText('Captured Title')).not.toBeInTheDocument();
  });

  it('still falls back when a failure merely mentions 403', async () => {
    // Guards against matching on the message text: the status has to come from the response.
    const http = {
      fetch: jest.fn().mockRejectedValue(new Error('request failed with 403 upstream')),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-1', title: 'Captured Title' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByTestId(THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID)).toHaveTextContent(
        'Captured Title'
      );
    });
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
      spaceId: 'default',
    });
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-ioc',
        content: { title: 'IOC Title' },
        severity: { level: 'high' },
        rank_score: 80,
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
        severity: { level: 'high' },
        rank_score: 60,
        source: { name: 'Source' },
        extracted: { iocs },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-overflow' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('60')).toBeInTheDocument();
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
        severity: { level: 'high' },
        rank_score: 70,
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ext' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('70')).toBeInTheDocument();
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
        severity: { level: 'high' },
        rank_score: 65,
        source: { name: 'Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-ext-bad' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('65')).toBeInTheDocument();
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
        rank_score: 55,
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
    });

    expect(screen.getByText('Alert hits')).toBeInTheDocument();
    expect(screen.queryByText(/alert_hits_total=/)).not.toBeInTheDocument();
  });

  it('shows a relative "Last hunted" stat when lastHuntedAt is present', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-last-hunted',
        content: { title: 'Last Hunted Title' },
        severity: { level: 'high' },
        rank_score: 45,
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
    });

    expect(screen.getByText('Last hunted')).toBeInTheDocument();
  });

  it('renders regions and categories as description-list badge groups', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-geo',
        content: { title: 'Geo Title' },
        severity: { level: 'high' },
        rank_score: 35,
        source: { name: 'Source' },
        extracted: { categories: ['exfiltration'] },
        geography: { regions: ['eu-west-1'] },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-geo' });

    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('35')).toBeInTheDocument();
    });

    expect(screen.getByText('Regions')).toBeInTheDocument();
    expect(screen.getByText('eu-west-1')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('exfiltration')).toBeInTheDocument();
  });
});
