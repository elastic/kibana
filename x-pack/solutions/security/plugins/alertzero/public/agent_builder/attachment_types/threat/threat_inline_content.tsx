/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { groupBy } from 'lodash';
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
import { buildDiscoverThreatReportNestedIocUrl } from '../navigation';
import { IocBadge } from '../shared/ioc_badge';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import { buildMitreTechniqueUrl } from '../shared/mitre_url';
import {
  THREAT_REPORT_API_PATH,
  THREAT_REPORT_API_VERSION,
  type ThreatReportApiResponse,
} from './threat_report_api';
import { threatAttachmentQueryClient } from './query_client';
import { isValidThreatAttachmentData } from './types';
import type { ThreatAttachment } from './types';

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

const clampedSummaryStyles = css`
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const DIAMOND_VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

const fetchThreatReport = async ({
  http,
  reportId,
  signal,
}: {
  http: HttpStart;
  reportId: string;
  signal?: AbortSignal;
}): Promise<ThreatReportApiResponse> =>
  http.fetch<ThreatReportApiResponse>(
    THREAT_REPORT_API_PATH.replace('{reportId}', encodeURIComponent(reportId)),
    { version: THREAT_REPORT_API_VERSION, method: 'GET', signal }
  );

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

interface ThreatIoc {
  type?: string;
  value?: string;
  severity?: string;
  tier?: string;
}

const IocTypeValues: React.FC<{
  type: string;
  iocs: ThreatIoc[];
  navigation: AttachmentNavigationDeps;
}> = ({ type, iocs, navigation }) => {
  const visible = iocs.slice(0, IOC_VISIBLE_LIMIT);
  const hidden = iocs.slice(IOC_VISIBLE_LIMIT);

  const renderBadge = (ioc: ThreatIoc, index: number) => {
    // Threat report IOCs live on nested `extracted.iocs`, not inventable logs-* fields.
    const href = buildDiscoverThreatReportNestedIocUrl({
      share: navigation.share,
      iocType: ioc.type ?? type,
      value: ioc.value ?? '',
    });
    const tooltipContent = [ioc.tier, ioc.severity].filter(Boolean).join(', ');
    const badge = (
      <span data-test-subj={`alertzeroThreatAttachmentIocLink-${type}-${index}`}>
        <IocBadge value={ioc.value ?? ''} index={index} discoverHref={href} />
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

interface DiamondVertexRow {
  vertex: (typeof DIAMOND_VERTICES)[number];
  signal?: string;
  summary?: string;
}

const renderEnrichedSections = ({
  liveData,
  navigation,
}: {
  liveData?: ThreatReportApiResponse;
  navigation: AttachmentNavigationDeps;
}): React.ReactNode => {
  if (!liveData) {
    return null;
  }

  const sections: React.ReactNode[] = [];

  const externalRefsWithUrl = liveData.content?.external_references?.filter(
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
                  {ref.source_name || ref.external_id || ref.url}
                </EuiLink>
              </li>
            ))}
          </ul>
        </EuiText>
      </div>
    );
  }

  if (liveData.extracted?.iocs?.length) {
    const iocsByType = groupBy(liveData.extracted.iocs, (ioc) => ioc.type);
    sections.push(
      <div key="iocs">
        {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.iocs', 'Indicators')}
        <LabeledBadgeTable
          testSubj="alertzeroThreatAttachmentIocTable"
          caption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.threat.iocTableCaption',
            { defaultMessage: 'Indicators of compromise by type' }
          )}
          rows={Object.entries(iocsByType).map(([type, iocs]) => ({
            id: type,
            label: type,
            values: <IocTypeValues type={type} iocs={iocs} navigation={navigation} />,
          }))}
        />
      </div>
    );
  }

  const tactics = liveData.extracted?.ttps?.tactics ?? [];
  const techniques = liveData.extracted?.ttps?.techniques ?? [];
  const regions = liveData.geography?.regions ?? [];
  const categories = liveData.extracted?.categories ?? [];
  if (tactics.length || techniques.length || regions.length || categories.length) {
    const listItems: Array<{ title: string; description: React.ReactElement }> = [];
    if (tactics.length) {
      listItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.tactics', {
          defaultMessage: 'Tactics',
        }),
        description: (
          <EuiBadgeGroup gutterSize="xs">
            {tactics.map((tactic) => (
              <EuiBadge key={tactic} color="hollow">
                {tactic}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      });
    }
    if (techniques.length) {
      listItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.techniques', {
          defaultMessage: 'Techniques',
        }),
        description: (
          <EuiBadgeGroup gutterSize="xs">
            {techniques.map((technique) => (
              <EuiBadge
                key={technique}
                color="hollow"
                href={buildMitreTechniqueUrl(technique)}
                target="_blank"
                rel="noopener noreferrer"
                iconType="external"
                iconSide="right"
              >
                {technique}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      });
    }
    if (regions.length) {
      listItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.regions', {
          defaultMessage: 'Regions',
        }),
        description: (
          <EuiBadgeGroup gutterSize="xs">
            {regions.map((region) => (
              <EuiBadge key={region} color="hollow">
                {region}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      });
    }
    if (categories.length) {
      listItems.push({
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.categories', {
          defaultMessage: 'Categories',
        }),
        description: (
          <EuiBadgeGroup gutterSize="xs">
            {categories.map((category) => (
              <EuiBadge key={category} color="hollow">
                {category}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      });
    }
    sections.push(
      <div key="ttps-geo-categories">
        <EuiDescriptionList type="column" compressed listItems={listItems} />
      </div>
    );
  }

  const diamond = liveData.extracted?.diamond;
  const diamondRows: DiamondVertexRow[] = diamond
    ? DIAMOND_VERTICES.filter((vertex) => diamond[vertex] != null).map((vertex) => ({
        vertex,
        signal: diamond[vertex]?.signal,
        summary: diamond[vertex]?.summary,
      }))
    : [];
  if (diamondRows.length) {
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
        <EuiBasicTable<DiamondVertexRow>
          compressed
          tableLayout="auto"
          responsiveBreakpoint={false}
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.threat.diamondTableCaption',
            { defaultMessage: 'Diamond model signals' }
          )}
          items={diamondRows}
          columns={[
            {
              field: 'vertex',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.vertex', {
                defaultMessage: 'Vertex',
              }),
              width: '9em',
            },
            {
              field: 'signal',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.signal', {
                defaultMessage: 'Signal',
              }),
              width: '6em',
              render: (signal?: string) =>
                signal ? <EuiBadge color="hollow">{signal}</EuiBadge> : null,
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
        {(diamond?.signal_count != null || diamond?.suitable != null) && (
          <>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {diamond?.signal_count != null && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.threat.diamondSignalCount',
                      {
                        defaultMessage: '{count} signals',
                        values: { count: diamond.signal_count },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {diamond?.suitable != null && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {diamond.suitable ? suitableBadge : notSuitableBadge}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
      </div>
    );
  }

  const severityScore = liveData.severity?.score;
  if (liveData.evidence || severityScore != null) {
    const corroboratedRank = liveData.evidence?.corroborated_rank_score;

    const stats: Array<{ title: React.ReactNode; description: string }> = [];
    if (severityScore != null) {
      stats.push({
        title: severityScore,
        description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.rank', {
          defaultMessage: 'Rank',
        }),
      });
    }
    if (liveData.evidence?.alert_hits_total != null) {
      stats.push({
        title: liveData.evidence.alert_hits_total,
        description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.alertHits', {
          defaultMessage: 'Alert hits',
        }),
      });
    }
    if (liveData.evidence?.last_hunt_status != null) {
      stats.push({
        title: liveData.evidence.last_hunt_status,
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
    if (liveData.evidence?.last_hunted_at != null) {
      stats.push({
        title: <FormattedRelative value={liveData.evidence.last_hunted_at} />,
        description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.lastHunted', {
          defaultMessage: 'Last hunted',
        }),
      });
    }

    if (stats.length > 0) {
      sections.push(
        <div key="evidence">
          {sectionHeading('xpack.alertzero.agentBuilder.attachments.threat.evidence', 'Evidence')}
          <EuiFlexGroup gutterSize="m" wrap responsive={false}>
            {stats.map((stat, index) => (
              <EuiFlexItem grow={false} key={index}>
                <EuiStat
                  titleElement="span"
                  descriptionElement="span"
                  titleSize="s"
                  textAlign="left"
                  title={stat.title}
                  description={stat.description}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      );
    }
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
  } = useQuery({
    queryKey: ['ALERTZERO_THREAT_ATTACHMENT', reportId],
    queryFn: ({ signal }) => {
      if (!reportId) {
        throw new Error('threat attachment fetch called without a report id');
      }
      return fetchThreatReport({ http, reportId, signal });
    },
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

  const hasAnyField = Boolean(data.title || data.severity || data.source);

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
