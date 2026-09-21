/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { KbnWarningCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { HttpStart } from '@kbn/core-http-browser';
import { QueryClientProvider, useQuery } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  buildThreatReportLookupEsql,
} from '../navigation';
import { IocBadge } from '../shared/ioc_badge';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import { buildMitreTechniqueUrl } from '../shared/mitre_url';
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

/** Max IOCs shown per type before collapsing the remainder behind an overflow popover. */
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

const sectionHeading = (id: string, defaultMessage: string) => (
  <EuiText size="s">
    <strong>{i18n.translate(id, { defaultMessage })}</strong>
  </EuiText>
);

/** Small `EuiPopover`-based "+N" overflow for a badge list capped at `IOC_VISIBLE_LIMIT`. */
const IocOverflowBadge: React.FC<{ hiddenCount: number; children: React.ReactNode }> = ({
  hiddenCount,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ariaLabel = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.iocsOverflowAriaLabel',
    { defaultMessage: 'Show {count} more indicators', values: { count: hiddenCount } }
  );
  return (
    <EuiPopover
      aria-label={ariaLabel}
      button={
        <EuiBadge
          color="hollow"
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel={ariaLabel}
        >
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.iocsMore', {
            defaultMessage: '+{count} more',
            values: { count: hiddenCount },
          })}
        </EuiBadge>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
    >
      <EuiFlexGroup gutterSize="xs" wrap responsive={false} css={{ maxWidth: 320 }}>
        {children}
      </EuiFlexGroup>
    </EuiPopover>
  );
};

const IocTypeValues: React.FC<{
  type: string;
  iocs: ThreatReportIoc[];
  navigation: AttachmentNavigationDeps;
}> = ({ type, iocs, navigation }) => {
  const visible = iocs.slice(0, IOC_VISIBLE_LIMIT);
  const hidden = iocs.slice(IOC_VISIBLE_LIMIT);

  const renderBadge = (ioc: ThreatReportIoc, index: number) => {
    // Threat report IOCs live on nested `extracted.iocs`, not inventable logs-* fields.
    const href = buildDiscoverThreatReportNestedIocUrl({
      share: navigation.share,
      iocType: ioc.type,
      value: ioc.value,
    });
    const tooltipContent = [ioc.tier, ioc.severity].filter(Boolean).join(', ');
    const badge = (
      <span data-test-subj={`alertzeroThreatAttachmentIocLink-${type}-${index}`}>
        <IocBadge value={ioc.value} index={index} discoverHref={href} />
      </span>
    );
    return (
      <EuiFlexItem grow={false} key={`${ioc.value}-${index}`}>
        {tooltipContent ? <EuiToolTip content={tooltipContent}>{badge}</EuiToolTip> : badge}
      </EuiFlexItem>
    );
  };

  return (
    <>
      {visible.map(renderBadge)}
      {hidden.length > 0 && (
        <EuiFlexItem grow={false} key={`${type}-overflow`}>
          <IocOverflowBadge hiddenCount={hidden.length}>
            {hidden.map((ioc, index) => renderBadge(ioc, IOC_VISIBLE_LIMIT + index))}
          </IocOverflowBadge>
        </EuiFlexItem>
      )}
    </>
  );
};

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
        <LabeledBadgeTable
          testSubj="alertzeroThreatAttachmentIocTable"
          caption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.threat.iocTableCaption',
            { defaultMessage: 'Indicators of compromise by type' }
          )}
          rows={[...iocsByType.entries()].map(([type, iocs]) => ({
            id: type,
            label: type,
            values: <IocTypeValues type={type} iocs={iocs} navigation={navigation} />,
          }))}
        />
      </div>
    );
  }

  if (liveData.ttps?.tactics.length || liveData.ttps?.techniques.length) {
    sections.push(
      <div key="ttps">
        {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.ttps', 'TTPs')}
        <LabeledBadgeTable
          testSubj="alertzeroThreatAttachmentTtpTable"
          caption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.threat.ttpTableCaption',
            { defaultMessage: 'Tactics and techniques' }
          )}
          rows={[
            ...(liveData.ttps.tactics.length > 0
              ? [
                  {
                    id: 'tactics',
                    label: i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.threat.tactics',
                      { defaultMessage: 'Tactics' }
                    ),
                    values: liveData.ttps.tactics.map((tactic) => (
                      <EuiBadge key={tactic} color="hollow">
                        {tactic}
                      </EuiBadge>
                    )),
                  },
                ]
              : []),
            ...(liveData.ttps.techniques.length > 0
              ? [
                  {
                    id: 'techniques',
                    label: i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.threat.techniques',
                      { defaultMessage: 'Techniques' }
                    ),
                    values: liveData.ttps.techniques.map((technique) => (
                      <EuiLink
                        key={technique}
                        href={buildMitreTechniqueUrl(technique)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <EuiBadge color="hollow">{technique}</EuiBadge>
                      </EuiLink>
                    )),
                  },
                ]
              : []),
          ]}
        />
      </div>
    );
  }

  if (liveData.diamond?.vertices.length) {
    const suitableBadge = i18n.translate(
      'xpack.alertzero.agentBuilder.attachments.threat.diamondSuitable',
      { defaultMessage: 'Suitable' }
    );
    const notSuitableBadge = i18n.translate(
      'xpack.alertzero.agentBuilder.attachments.threat.diamondNotSuitable',
      { defaultMessage: 'Not suitable' }
    );
    sections.push(
      <div key="diamond">
        {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.diamond', 'Diamond model')}
        <EuiBasicTable<ThreatReportDiamondVertex>
          compressed
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
          <>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {liveData.diamond.signalCount != null && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.threat.diamondSignalCount',
                      {
                        defaultMessage: '{count} signals',
                        values: { count: liveData.diamond.signalCount },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {liveData.diamond.suitable != null && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {liveData.diamond.suitable ? suitableBadge : notSuitableBadge}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
      </div>
    );
  }

  if (liveData.evidence) {
    const corroboratedRank =
      liveData.evidence.corroboratedRankScore ?? liveData.corroboratedRankScore;

    const stats: Array<{ title: React.ReactNode; description: string }> = [];
    if (liveData.evidence.alertHitsTotal != null) {
      stats.push({
        title: liveData.evidence.alertHitsTotal,
        description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.alertHits', {
          defaultMessage: 'Alert hits',
        }),
      });
    }
    if (liveData.evidence.lastHuntStatus != null) {
      stats.push({
        title: liveData.evidence.lastHuntStatus,
        description: i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.threat.lastHuntStatus',
          { defaultMessage: 'Last hunt status' }
        ),
      });
    }
    if (corroboratedRank != null) {
      stats.push({
        title: corroboratedRank,
        description: i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.threat.corroboratedRank',
          { defaultMessage: 'Corroborated rank' }
        ),
      });
    }
    if (liveData.evidence.lastHuntedAt != null) {
      stats.push({
        title: <FormattedRelative value={liveData.evidence.lastHuntedAt} />,
        description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.lastHunted', {
          defaultMessage: 'Last hunted',
        }),
      });
    }

    if (stats.length > 0) {
      sections.push(
        <div key="evidence">
          {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.evidence', 'Evidence')}
          <EuiFlexGroup gutterSize="l" wrap responsive={false}>
            {stats.map((stat, index) => (
              <EuiFlexItem grow={false} key={index}>
                <EuiStat title={stat.title} description={stat.description} titleSize="xs" reverse />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      );
    }
  }

  if (liveData.regions?.length || liveData.categories?.length) {
    const listItems: Array<{ title: string; description: React.ReactElement }> = [];
    if (liveData.regions?.length) {
      listItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.regions', {
          defaultMessage: 'Regions',
        }),
        description: (
          <EuiBadgeGroup gutterSize="xs">
            {liveData.regions.map((region) => (
              <EuiBadge key={region} color="hollow">
                {region}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      });
    }
    if (liveData.categories?.length) {
      listItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.categories', {
          defaultMessage: 'Categories',
        }),
        description: (
          <EuiBadgeGroup gutterSize="xs">
            {liveData.categories.map((category) => (
              <EuiBadge key={category} color="hollow">
                {category}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      });
    }
    sections.push(
      <div key="geo-categories">
        <EuiDescriptionList type="column" compressed listItems={listItems} />
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
        hasBorder={false}
        paddingSize="s"
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

  // One shared fallback path covers 403, 404, 503, and route-absent cases (no status-code
  // branching). The captured fields render whenever the live fetch hasn't resolved yet
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
      hasBorder={false}
      paddingSize="s"
      data-test-subj={THREAT_ATTACHMENT_TEST_ID}
    >
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <IocBadge
                value={data.report_id}
                index={0}
                discoverHref={reportHref}
                testSubj="alertzeroThreatAttachmentReportLink"
              />
            </EuiFlexItem>
            {useLive && severityScore != null && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.rankBadge', {
                    defaultMessage: 'Rank {score}',
                    values: { score: severityScore },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

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
                          'Showing captured fields. The live report could not be resolved.',
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
