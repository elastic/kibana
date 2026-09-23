/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { groupBy } from 'lodash';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { HttpStart } from '@kbn/core-http-browser';
import { QueryClientProvider, useQuery } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildDiscoverThreatReportNestedIocUrl } from '../navigation';
import { IocBadge, discoverAction } from '../shared/ioc_badge';
import {
  Section,
  SectionStack,
  MetaCard,
  HollowBadgeList,
  BadgeRow,
  AttachmentEmptyState,
  buildMitreTechniqueUrl,
  clampTwoLines,
} from '../shared/primitives';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import { DIAMOND_VERTICES, severityBadgeColor } from '../shared/severity';
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
export const THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID = 'alertzeroThreatAttachmentCapturedFields';
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
      <div css={{ maxWidth: 360 }}>
        <BadgeRow>{children}</BadgeRow>
      </div>
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
      spaceId: navigation.spaceId,
    });
    const tooltipContent = [ioc.tier, ioc.severity].filter(Boolean).join(', ');
    const badge = (
      <IocBadge
        value={ioc.value ?? ''}
        index={index}
        action={discoverAction(href)}
        testSubj={`alertzeroThreatAttachmentIocLink-${type}-${index}`}
      />
    );
    return (
      <React.Fragment key={`${ioc.value}-${index}`}>
        {tooltipContent ? <EuiToolTip content={tooltipContent}>{badge}</EuiToolTip> : badge}
      </React.Fragment>
    );
  };

  return (
    <>
      {visible.map(renderBadge)}
      {hidden.length > 0 && (
        <IocOverflowBadge key={`${type}-overflow`} hiddenCount={hidden.length}>
          {hidden.map((ioc, index) => renderBadge(ioc, IOC_VISIBLE_LIMIT + index))}
        </IocOverflowBadge>
      )}
    </>
  );
};

const renderExternalReferencesSection = (liveData: ThreatReportApiResponse): React.ReactNode => {
  const externalRefsWithUrl = liveData.content?.external_references?.filter(
    (ref): ref is typeof ref & { url: string } =>
      typeof ref.url === 'string' && isHttpExternalUrl(ref.url)
  );
  if (!externalRefsWithUrl?.length) {
    return null;
  }
  return (
    <Section
      key="external-refs"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.externalReferences', {
        defaultMessage: 'External references',
      })}
    >
      <BadgeRow>
        {externalRefsWithUrl.map((ref, index) => (
          <EuiBadge
            key={`${ref.url}-${index}`}
            color="hollow"
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            iconType="external"
            iconSide="right"
            data-test-subj={THREAT_EXTERNAL_REF_LINK_TEST_ID}
          >
            {ref.source_name || ref.external_id || ref.url}
          </EuiBadge>
        ))}
      </BadgeRow>
    </Section>
  );
};

const renderIocsSection = (
  liveData: ThreatReportApiResponse,
  navigation: AttachmentNavigationDeps
): React.ReactNode => {
  const iocs = liveData.extracted?.iocs ?? [];
  if (!iocs.length) {
    return null;
  }
  const iocsByType = groupBy(iocs, (ioc) => ioc.type);
  return (
    <Section
      key="iocs"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.iocs', {
        defaultMessage: 'Indicators',
      })}
      aside={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.iocCount', {
            defaultMessage: '{count, plural, one {# indicator} other {# indicators}}',
            values: { count: iocs.length },
          })}
        </EuiText>
      }
    >
      <LabeledBadgeTable
        testSubj="alertzeroThreatAttachmentIocTable"
        caption={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.iocTableCaption', {
          defaultMessage: 'Indicators of compromise by type',
        })}
        rows={Object.entries(iocsByType).map(([type, group]) => ({
          id: type,
          label: type,
          values: <IocTypeValues type={type} iocs={group} navigation={navigation} />,
        }))}
      />
    </Section>
  );
};

const renderTtpsGeoCategoriesSection = (liveData: ThreatReportApiResponse): React.ReactNode => {
  const tactics = liveData.extracted?.ttps?.tactics ?? [];
  const techniques = liveData.extracted?.ttps?.techniques ?? [];
  const regions = liveData.geography?.regions ?? [];
  const categories = liveData.extracted?.categories ?? [];
  if (!tactics.length && !techniques.length && !regions.length && !categories.length) {
    return null;
  }

  const rows: Array<{ id: string; label: string; values: React.ReactNode }> = [];
  if (tactics.length) {
    rows.push({
      id: 'tactics',
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.tactics', {
        defaultMessage: 'Tactics',
      }),
      values: <HollowBadgeList items={tactics} />,
    });
  }
  if (techniques.length) {
    rows.push({
      id: 'techniques',
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.techniques', {
        defaultMessage: 'Techniques',
      }),
      values: <HollowBadgeList items={techniques} getHref={buildMitreTechniqueUrl} />,
    });
  }
  if (regions.length) {
    rows.push({
      id: 'regions',
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.regions', {
        defaultMessage: 'Regions',
      }),
      values: <HollowBadgeList items={regions} />,
    });
  }
  if (categories.length) {
    rows.push({
      id: 'categories',
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.categories', {
        defaultMessage: 'Categories',
      }),
      values: <HollowBadgeList items={categories} />,
    });
  }
  return (
    <Section
      key="ttps-geo-categories"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.context', {
        defaultMessage: 'Context',
      })}
    >
      <LabeledBadgeTable
        rows={rows}
        caption={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.contextCaption', {
          defaultMessage: 'Tactics, techniques, regions and categories',
        })}
      />
    </Section>
  );
};

/** Known signal strengths map to a colour; anything else stays neutral but is still shown. */
const DIAMOND_SIGNAL_COLOR: Record<string, string> = {
  strong: 'success',
  high: 'success',
  moderate: 'warning',
  medium: 'warning',
  weak: 'hollow',
  low: 'hollow',
  none: 'hollow',
};

const DIAMOND_VERTEX_LABELS: Record<(typeof DIAMOND_VERTICES)[number], string> = {
  adversary: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.vertexAdversary', {
    defaultMessage: 'Adversary',
  }),
  capability: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.vertexCapability', {
    defaultMessage: 'Capability',
  }),
  infrastructure: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.vertexInfrastructure',
    { defaultMessage: 'Infrastructure' }
  ),
  victim: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.vertexVictim', {
    defaultMessage: 'Victim',
  }),
};

const DiamondVertexCard: React.FC<{
  vertex: (typeof DIAMOND_VERTICES)[number];
  signal?: string;
  summary?: string;
}> = ({ vertex, signal, summary }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <MetaCard
      label={DIAMOND_VERTEX_LABELS[vertex]}
      testSubj={`alertzeroThreatAttachmentDiamond-${vertex}`}
    >
      <div>
        {signal ? (
          <EuiBadge color={DIAMOND_SIGNAL_COLOR[signal.toLowerCase()] ?? 'hollow'}>
            {signal}
          </EuiBadge>
        ) : (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.vertexNoSignal', {
              defaultMessage: 'No signal',
            })}
          </EuiText>
        )}
      </div>
      {summary && (
        <EuiToolTip content={summary} display="block" position="bottom">
          <EuiText size="xs" css={[clampTwoLines, { marginTop: euiTheme.size.xs }]} tabIndex={0}>
            {summary}
          </EuiText>
        </EuiToolTip>
      )}
    </MetaCard>
  );
};

const renderDiamondSection = (liveData: ThreatReportApiResponse): React.ReactNode => {
  const diamond = liveData.extracted?.diamond;
  const vertices = diamond ? DIAMOND_VERTICES.filter((vertex) => diamond[vertex] != null) : [];
  if (!vertices.length) {
    return null;
  }

  const suitableBadge = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.diamondSuitable',
    { defaultMessage: 'Suitable' }
  );
  const notSuitableBadge = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.diamondNotSuitable',
    { defaultMessage: 'Not suitable' }
  );

  const aside =
    diamond?.signal_count != null || diamond?.suitable != null ? (
      <BadgeRow>
        {diamond?.signal_count != null && (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.diamondSignalCount', {
              defaultMessage: '{count} signals',
              values: { count: diamond.signal_count },
            })}
          </EuiBadge>
        )}
        {diamond?.suitable != null && (
          <EuiBadge color={diamond.suitable ? 'success' : 'hollow'}>
            {diamond.suitable ? suitableBadge : notSuitableBadge}
          </EuiBadge>
        )}
      </BadgeRow>
    ) : undefined;

  return (
    <Section
      key="diamond"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.diamond', {
        defaultMessage: 'Diamond model',
      })}
      aside={aside}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        {vertices.map((vertex) => (
          <EuiFlexItem key={vertex} css={{ minWidth: 140 }}>
            <DiamondVertexCard
              vertex={vertex}
              signal={diamond?.[vertex]?.signal}
              summary={diamond?.[vertex]?.summary}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </Section>
  );
};

/** Known hunt statuses get a label; anything else is shown as-is. */
const HUNT_STATUS_LABELS: Record<string, string> = {
  environment_hits_found: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.huntStatusHitsFound',
    { defaultMessage: 'Environment hits found' }
  ),
  no_environment_hits: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.huntStatusNoHits',
    { defaultMessage: 'No environment hits' }
  ),
  no_searchable_terms: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.threat.huntStatusNoTerms',
    { defaultMessage: 'No searchable terms' }
  ),
};

const renderEvidenceSection = (liveData: ThreatReportApiResponse): React.ReactNode => {
  const rankScore = liveData.rank_score;
  if (!liveData.evidence && rankScore == null) {
    return null;
  }

  const corroboratedRank = liveData.evidence?.corroborated_rank_score;
  const stats: Array<{ title: React.ReactNode; description: string }> = [];
  if (rankScore != null) {
    stats.push({
      title: rankScore,
      description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.rank', {
        defaultMessage: 'Rank',
      }),
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
      title: (
        <EuiBadge
          color={
            liveData.evidence.last_hunt_status === 'environment_hits_found' ? 'warning' : 'hollow'
          }
        >
          {HUNT_STATUS_LABELS[liveData.evidence.last_hunt_status] ??
            liveData.evidence.last_hunt_status}
        </EuiBadge>
      ),
      description: i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.threat.lastHuntStatus',
        { defaultMessage: 'Last hunt status' }
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

  if (stats.length === 0) {
    return null;
  }
  return (
    <Section
      key="evidence"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.evidence', {
        defaultMessage: 'Evidence',
      })}
    >
      <LabeledBadgeTable
        testSubj="alertzeroThreatAttachmentEvidenceTable"
        caption={i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.threat.evidenceTableCaption',
          { defaultMessage: 'Threat report evidence' }
        )}
        rows={stats.map((stat) => ({
          id: stat.description,
          label: stat.description,
          values: <EuiText size="xs">{stat.title}</EuiText>,
        }))}
      />
    </Section>
  );
};

const ThreatHeadline = ({
  title,
  severity,
  source,
  testSubj,
}: {
  title?: string;
  severity?: string;
  source?: string;
  testSubj: string;
}): React.ReactNode => {
  if (!title && !severity && !source) {
    return null;
  }

  return (
    <div key="headline" data-test-subj={testSubj}>
      {title && (
        <EuiTitle size="xs">
          <h3 css={{ overflowWrap: 'anywhere' }}>{title}</h3>
        </EuiTitle>
      )}
      {(severity || source) && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
            {severity && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={severityBadgeColor(severity)}>{severity}</EuiBadge>
              </EuiFlexItem>
            )}
            {source && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {source}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};

const renderHeadlineSection = (liveData: ThreatReportApiResponse): React.ReactNode => (
  <ThreatHeadline
    key="headline"
    title={liveData.content?.title}
    severity={liveData.severity?.level}
    source={liveData.source?.name}
    testSubj="alertzeroThreatAttachmentHeadline"
  />
);

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

  const sections = [
    renderHeadlineSection(liveData),
    renderIocsSection(liveData, navigation),
    renderTtpsGeoCategoriesSection(liveData),
    renderDiamondSection(liveData),
    renderEvidenceSection(liveData),
    renderExternalReferencesSection(liveData),
  ].filter((section): section is React.ReactElement => section != null);

  if (sections.length === 0) {
    return null;
  }

  return <SectionStack>{sections}</SectionStack>;
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
      <AttachmentEmptyState
        testSubj={THREAT_ATTACHMENT_EMPTY_TEST_ID}
        variant="warning"
        message={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.empty.title', {
          defaultMessage: 'No threat report reference available',
        })}
      />
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
      paddingSize="m"
      data-test-subj={THREAT_ATTACHMENT_TEST_ID}
    >
      {isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <>
          {useLive && renderEnrichedSections({ liveData, navigation })}
          {!useLive && (
            <>
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
              {hasAnyField && (
                <>
                  <EuiSpacer size="m" />
                  <EuiDescriptionList
                    compressed
                    type="column"
                    columnWidths={['7em', '1fr']}
                    columnGutterSize="s"
                    rowGutterSize="s"
                    data-test-subj={THREAT_ATTACHMENT_CAPTURED_FIELDS_TEST_ID}
                    listItems={(
                      [
                        [
                          i18n.translate(
                            'xpack.alertzero.agentBuilder.attachments.threat.capturedTitle',
                            { defaultMessage: 'Title' }
                          ),
                          data.title,
                        ],
                        [
                          i18n.translate(
                            'xpack.alertzero.agentBuilder.attachments.threat.capturedSeverity',
                            { defaultMessage: 'Severity' }
                          ),
                          data.severity ? (
                            <EuiBadge color={severityBadgeColor(data.severity)}>
                              {data.severity}
                            </EuiBadge>
                          ) : undefined,
                        ],
                        [
                          i18n.translate(
                            'xpack.alertzero.agentBuilder.attachments.threat.capturedSource',
                            { defaultMessage: 'Source' }
                          ),
                          data.source,
                        ],
                      ] as Array<[string, React.ReactNode]>
                    )
                      .filter(
                        (entry): entry is [string, NonNullable<React.ReactNode>] => entry[1] != null
                      )
                      .map(([title, description]) => ({
                        title: (
                          <EuiText size="xs" color="subdued">
                            {title}
                          </EuiText>
                        ),
                        description,
                      }))}
                  />
                </>
              )}
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
