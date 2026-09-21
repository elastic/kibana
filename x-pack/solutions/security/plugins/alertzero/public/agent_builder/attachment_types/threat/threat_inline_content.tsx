/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { KbnWarningCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { QueryClientProvider, useQuery } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  buildThreatReportLookupEsql,
  DiscoverLink,
} from '../navigation';
import { THREAT_REPORT_API_PATH, THREAT_REPORT_API_VERSION } from './threat_report_api';
import { threatAttachmentQueryClient } from './query_client';
import { isValidThreatAttachmentData } from './types';
import type {
  ThreatAttachment,
  ThreatReportDiamondVertex,
  ThreatReportIoc,
  ThreatReportLiveData,
} from './types';

export const THREAT_ATTACHMENT_TEST_ID = 'alertzeroThreatAttachment';
export const THREAT_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroThreatAttachmentEmpty';
export const THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID = 'alertzeroThreatAttachmentUnavailable';
export const THREAT_EXTERNAL_REF_LINK_TEST_ID = 'alertzeroThreatExternalRefLink';

const IOC_VISIBLE_LIMIT = 8;

/** Only render http(s) external references; threat-report URLs are untrusted feed content. */
const isHttpExternalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const cellStyles = css`
  overflow-wrap: anywhere;
`;

const monoStyles = css`
  font-family: monospace;
  overflow-wrap: anywhere;
`;

const clampedSummaryStyles = css`
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

interface ThreatReportResponse {
  reportId?: string;
  content?: {
    title?: string;
    external_references?: Array<{ source_name?: string; url?: string; external_id?: string }>;
  };
  severity?: { level?: string; score?: number };
  source?: { name?: string };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string; severity?: string; tier?: string }>;
    ttps?: { tactics?: string[]; techniques?: string[] };
    categories?: string[];
    diamond?: {
      adversary?: { signal?: string; summary?: string };
      capability?: { signal?: string; summary?: string };
      infrastructure?: { signal?: string; summary?: string };
      victim?: { signal?: string; summary?: string };
      signal_count?: number;
      suitable?: boolean;
    };
  };
  geography?: { regions?: string[] };
  rank_score?: number;
  evidence?: {
    alert_hits_total?: number;
    last_hunt_status?: string;
    last_hunted_at?: string;
    last_hunt_run_id?: string;
    corroborated_rank_score?: number;
  };
}

const DIAMOND_VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

const fetchThreatReport = async ({
  http,
  reportId,
  signal,
}: {
  http: HttpStart;
  reportId: string;
  signal?: AbortSignal;
}): Promise<ThreatReportLiveData> => {
  const response = await http.fetch<ThreatReportResponse>(
    THREAT_REPORT_API_PATH.replace('{reportId}', encodeURIComponent(reportId)),
    { version: THREAT_REPORT_API_VERSION, method: 'GET', signal }
  );

  const diamondSource = response?.extracted?.diamond;
  const diamondVertices = diamondSource
    ? DIAMOND_VERTICES.filter((vertex) => diamondSource[vertex] != null).map((vertex) => ({
        vertex,
        signal: diamondSource[vertex]?.signal,
        summary: diamondSource[vertex]?.summary,
      }))
    : [];

  return {
    title: response?.content?.title,
    severityLevel: response?.severity?.level,
    severityScore: response?.severity?.score,
    sourceName: response?.source?.name,
    iocs: response?.extracted?.iocs?.map((ioc) => ({
      type: ioc.type ?? 'unknown',
      value: ioc.value ?? '',
      severity: ioc.severity,
      tier: ioc.tier,
    })),
    ttps:
      response?.extracted?.ttps &&
      (response.extracted.ttps.tactics?.length || response.extracted.ttps.techniques?.length)
        ? {
            tactics: response.extracted.ttps.tactics ?? [],
            techniques: response.extracted.ttps.techniques ?? [],
          }
        : undefined,
    diamond: diamondVertices.length
      ? {
          vertices: diamondVertices,
          signalCount: diamondSource?.signal_count,
          suitable: diamondSource?.suitable,
        }
      : undefined,
    categories: response?.extracted?.categories,
    regions: response?.geography?.regions,
    corroboratedRankScore: response?.evidence?.corroborated_rank_score,
    evidence: response?.evidence
      ? {
          alertHitsTotal: response.evidence.alert_hits_total,
          lastHuntStatus: response.evidence.last_hunt_status,
          lastHuntedAt: response.evidence.last_hunted_at,
          lastHuntRunId: response.evidence.last_hunt_run_id,
          corroboratedRankScore: response.evidence.corroborated_rank_score,
        }
      : undefined,
    externalReferences: response?.content?.external_references?.map((ref) => ({
      sourceName: ref.source_name,
      url: ref.url,
      externalId: ref.external_id,
    })),
  };
};

const SEVERITY_COLOR_MAP: Record<string, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const sectionHeading = (id: string, defaultMessage: string) => (
  <EuiText size="s">
    <strong>{i18n.translate(id, { defaultMessage })}</strong>
  </EuiText>
);

const renderEnrichedSections = ({
  liveData,
  navigation,
}: {
  liveData?: ThreatReportLiveData;
  navigation: AttachmentNavigationDeps;
}): React.ReactNode => {
  if (!liveData) {
    return null;
  }

  const sections: React.ReactNode[] = [];

  const externalRefsWithUrl = liveData.externalReferences?.filter(
    (ref) => typeof ref.url === 'string' && isHttpExternalUrl(ref.url)
  );
  if (externalRefsWithUrl?.length) {
    sections.push(
      <div key="external-refs">
        {sectionHeading(
          'xpack.alertzero.agentBuilder.attachments.threat.externalReferences',
          'External references'
        )}
        <EuiText size="s">
          <ul>
            {externalRefsWithUrl.map((ref, index) => (
              <li key={`${ref.url}-${index}`}>
                <EuiLink
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj={THREAT_EXTERNAL_REF_LINK_TEST_ID}
                >
                  {ref.sourceName || ref.externalId || ref.url}
                </EuiLink>
              </li>
            ))}
          </ul>
        </EuiText>
      </div>
    );
  }

  if (liveData.iocs?.length) {
    const iocsByType = new Map<string, ThreatReportIoc[]>();
    for (const ioc of liveData.iocs) {
      const bucket = iocsByType.get(ioc.type) ?? [];
      bucket.push(ioc);
      iocsByType.set(ioc.type, bucket);
    }
    sections.push(
      <div key="iocs">
        {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.iocs', 'Indicators')}
        {[...iocsByType.entries()].map(([type, iocs]) => {
          const visible = iocs.slice(0, IOC_VISIBLE_LIMIT);
          const remaining = iocs.length - visible.length;
          return (
            <div key={type} css={{ marginBottom: 4 }}>
              <EuiText size="xs" color="subdued" css={cellStyles}>
                {type}
              </EuiText>
              {visible.map((ioc, index) => {
                // Threat report IOCs live on nested `extracted.iocs`, not inventable logs-* fields.
                const href = buildDiscoverThreatReportNestedIocUrl({
                  share: navigation.share,
                  iocType: ioc.type,
                  value: ioc.value,
                });
                const label = `${ioc.value}${ioc.tier ? ` (${ioc.tier})` : ''}`;
                return (
                  <span key={`${ioc.value}-${index}`} css={{ marginRight: 4, marginBottom: 4 }}>
                    <DiscoverLink
                      href={href}
                      testSubj={`alertzeroThreatAttachmentIocLink-${type}-${index}`}
                    >
                      <EuiBadge color="hollow">{label}</EuiBadge>
                    </DiscoverLink>
                  </span>
                );
              })}
              {remaining > 0 && (
                <EuiText size="xs" color="subdued" css={{ display: 'inline' }}>
                  {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.iocsMore', {
                    defaultMessage: '+{count} more',
                    values: { count: remaining },
                  })}
                </EuiText>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (liveData.ttps?.tactics.length || liveData.ttps?.techniques.length) {
    sections.push(
      <div key="ttps">
        {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.ttps', 'TTPs')}
        {liveData.ttps.tactics.length > 0 && (
          <div css={{ marginBottom: 4 }}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.tactics', {
                defaultMessage: 'Tactics',
              })}
            </EuiText>
            {liveData.ttps.tactics.map((tactic) => (
              <EuiBadge key={tactic} color="hollow" css={{ marginRight: 4 }}>
                {tactic}
              </EuiBadge>
            ))}
          </div>
        )}
        {liveData.ttps.techniques.length > 0 && (
          <div>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.techniques', {
                defaultMessage: 'Techniques',
              })}
            </EuiText>
            {liveData.ttps.techniques.map((technique) => (
              <EuiBadge key={technique} color="hollow" css={{ marginRight: 4 }}>
                {technique}
              </EuiBadge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (liveData.diamond?.vertices.length) {
    sections.push(
      <div key="diamond">
        {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.diamond', 'Diamond model')}
        <EuiBasicTable<ThreatReportDiamondVertex>
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.threat.diamondTableCaption',
            { defaultMessage: 'Diamond model signals' }
          )}
          items={liveData.diamond.vertices}
          columns={[
            {
              field: 'vertex',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.vertex', {
                defaultMessage: 'Vertex',
              }),
            },
            {
              field: 'signal',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.signal', {
                defaultMessage: 'Signal',
              }),
              render: (signal?: string) => <span css={cellStyles}>{signal}</span>,
            },
            {
              field: 'summary',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.summary', {
                defaultMessage: 'Summary',
              }),
              render: (summary?: string) =>
                summary ? (
                  <EuiToolTip content={summary} display="block" position="left">
                    <span tabIndex={0} css={clampedSummaryStyles}>
                      {summary}
                    </span>
                  </EuiToolTip>
                ) : null,
            },
          ]}
        />
        {(liveData.diamond.signalCount != null || liveData.diamond.suitable != null) && (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.diamondCaption', {
              defaultMessage: 'signal_count={signalCount}, suitable={suitable}',
              values: {
                signalCount: liveData.diamond.signalCount ?? 0,
                suitable: String(liveData.diamond.suitable ?? false),
              },
            })}
          </EuiText>
        )}
      </div>
    );
  }

  if (liveData.evidence) {
    const evidenceItems: Array<{ title: string; description: string }> = [];
    if (liveData.evidence.alertHitsTotal != null) {
      evidenceItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.alertHits', {
          defaultMessage: 'Alert hits',
        }),
        description: String(liveData.evidence.alertHitsTotal),
      });
    }
    if (liveData.evidence.lastHuntStatus != null) {
      evidenceItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.lastHuntStatus', {
          defaultMessage: 'Last hunt status',
        }),
        description: liveData.evidence.lastHuntStatus,
      });
    }
    const corroboratedRank =
      liveData.evidence.corroboratedRankScore ?? liveData.corroboratedRankScore;
    if (corroboratedRank != null) {
      evidenceItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.corroboratedRank', {
          defaultMessage: 'Corroborated rank',
        }),
        description: String(corroboratedRank),
      });
    }
    if (evidenceItems.length > 0) {
      sections.push(
        <div key="evidence">
          {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.evidence', 'Evidence')}
          <EuiDescriptionList type="column" compressed listItems={evidenceItems} />
        </div>
      );
    }
  }

  if (liveData.regions?.length || liveData.categories?.length) {
    sections.push(
      <div key="geo-categories">
        {liveData.regions?.length ? (
          <div css={{ marginBottom: 4 }}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.regions', {
                defaultMessage: 'Regions',
              })}
            </EuiText>
            {liveData.regions.map((region) => (
              <EuiBadge key={region} color="hollow" css={{ marginRight: 4 }}>
                {region}
              </EuiBadge>
            ))}
          </div>
        ) : null}
        {liveData.categories?.length ? (
          <div>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.categories', {
                defaultMessage: 'Categories',
              })}
            </EuiText>
            {liveData.categories.map((category) => (
              <EuiBadge key={category} color="hollow" css={{ marginRight: 4 }}>
                {category}
              </EuiBadge>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      {sections.map((section, index) => (
        <React.Fragment key={index}>
          {index > 0 && <EuiSpacer size="s" />}
          {section}
        </React.Fragment>
      ))}
    </>
  );
};

export interface ThreatAttachmentInlineContentProps
  extends AttachmentRenderProps<ThreatAttachment> {
  http: HttpStart;
  navigation: AttachmentNavigationDeps;
}

const ThreatAttachmentInlineContentInner: React.FC<ThreatAttachmentInlineContentProps> = ({
  attachment,
  http,
  navigation,
}) => {
  const data = attachment?.data;
  const isValid = isValidThreatAttachmentData(data);
  const reportId = isValid ? data.report_id : undefined;

  const {
    isLoading,
    error,
    data: liveData,
  } = useQuery<ThreatReportLiveData, unknown>({
    queryKey: ['ALERTZERO_THREAT_ATTACHMENT', reportId],
    queryFn: ({ signal }) => fetchThreatReport({ http, reportId: reportId as string, signal }),
    enabled: reportId != null,
  });

  if (!isValid) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj={THREAT_ATTACHMENT_EMPTY_TEST_ID}
      >
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.empty.title', {
            defaultMessage: 'No threat report reference available',
          })}
        />
      </EuiPanel>
    );
  }

  // One shared fallback path covers 403 / 404 / 503 / route-absent — no status-code
  // branching. The captured fields render whenever the live fetch hasn't resolved yet
  // or failed for any reason.
  const useLive = !isLoading && !error && liveData != null;

  const title = useLive ? liveData?.title ?? data.title : data.title;
  const severityLevel = useLive ? liveData?.severityLevel ?? data.severity : data.severity;
  const severityScore = useLive ? liveData?.severityScore : undefined;
  const sourceName = useLive ? liveData?.sourceName ?? data.source : data.source;

  const hasAnyField = Boolean(title || severityLevel || sourceName);

  const reportEsql = buildThreatReportLookupEsql({ reportId: data.report_id });
  const reportHref = buildDiscoverEsqlUrl({ share: navigation.share, esql: reportEsql });

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={THREAT_ATTACHMENT_TEST_ID}
    >
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
            {title && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong css={cellStyles}>{title}</strong>
                </EuiText>
              </EuiFlexItem>
            )}
            {severityLevel && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={SEVERITY_COLOR_MAP[severityLevel] ?? 'hollow'}>
                  {severityScore != null ? `${severityLevel} (${severityScore})` : severityLevel}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {sourceName && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <span css={cellStyles}>{sourceName}</span>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <DiscoverLink href={reportHref} testSubj="alertzeroThreatAttachmentReportLink">
              <span css={monoStyles}>{data.report_id}</span>
            </DiscoverLink>
          </EuiText>

          {useLive && renderEnrichedSections({ liveData, navigation })}
          {!useLive && (
            <>
              <EuiSpacer size="s" />
              <KbnInfoCallout
                announceOnMount
                size="s"
                data-test-subj={THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID}
                title={
                  hasAnyField
                    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.captured', {
                        defaultMessage:
                          'Showing captured fields — the live report could not be resolved.',
                      })
                    : i18n.translate(
                        'xpack.alertzero.agentBuilder.attachments.threat.unavailable',
                        {
                          defaultMessage: 'Report unavailable',
                        }
                      )
                }
              />
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};

export const ThreatAttachmentInlineContent: React.FC<ThreatAttachmentInlineContentProps> = (
  props
) => (
  <QueryClientProvider client={threatAttachmentQueryClient}>
    <ThreatAttachmentInlineContentInner {...props} />
  </QueryClientProvider>
);
