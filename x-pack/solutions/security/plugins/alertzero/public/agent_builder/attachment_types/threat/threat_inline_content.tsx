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
  asBoolean,
  asNumber,
  asRecord,
  asRecordArray,
  asString,
  asStringArray,
} from '../shared/runtime_guards';
import {
  THREAT_REPORT_API_PATH,
  THREAT_REPORT_API_VERSION,
  type ThreatReportApiResponse,
} from './threat_report_api';
import { threatAttachmentQueryClient } from './query_client';
import { isValidThreatAttachmentData } from './types';
import type { ThreatAttachment } from './types';

const THREAT_ATTACHMENT_TEST_ID = 'alertzeroThreatAttachment';
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

/**
 * Whether the report read was denied, as opposed to failing for any other reason. Reads the
 * status off both `response` and `body`, because an intercepted error can arrive carrying only
 * the parsed body. 401 is deliberately not included: an expired session is not a denial of this
 * report, and Kibana re-prompts for it elsewhere.
 */
const isHttpForbidden = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { response, body } = error as {
    response?: { status?: unknown };
    body?: { statusCode?: unknown };
  };
  return asNumber(response?.status) === 403 || asNumber(asRecord(body)?.statusCode) === 403;
};

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
    const value = asString(ioc.value) ?? '';
    // Threat report IOCs live on nested `extracted.iocs`, not inventable logs-* fields.
    const href = buildDiscoverThreatReportNestedIocUrl({
      share: navigation.share,
      iocType: asString(ioc.type) ?? type,
      value,
      spaceId: navigation.spaceId,
    });
    const tooltipContent = [asString(ioc.tier), asString(ioc.severity)].filter(Boolean).join(', ');
    const badge = (
      <IocBadge
        value={value}
        index={index}
        action={discoverAction(href)}
        testSubj={`alertzeroThreatAttachmentIocLink-${type}-${index}`}
      />
    );
    return (
      <React.Fragment key={`${value}-${index}`}>
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
  const externalRefsWithUrl = asRecordArray(liveData.content?.external_references).filter(
    (ref): ref is typeof ref & { url: string } =>
      typeof ref.url === 'string' && isHttpExternalUrl(ref.url)
  );
  if (!externalRefsWithUrl.length) {
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
            {asString(ref.source_name) || asString(ref.external_id) || ref.url}
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
  const iocs = asRecordArray(liveData.extracted?.iocs);
  if (!iocs.length) {
    return null;
  }
  const iocsByType = groupBy(iocs, (ioc) => asString(ioc.type));
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
  const tactics = asStringArray(liveData.extracted?.ttps?.tactics);
  const techniques = asStringArray(liveData.extracted?.ttps?.techniques);
  const regions = asStringArray(liveData.geography?.regions);
  const categories = asStringArray(liveData.extracted?.categories);
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
  const diamond = asRecord(liveData.extracted?.diamond);
  const vertices = diamond
    ? DIAMOND_VERTICES.filter((vertex) => asRecord(diamond[vertex]) != null)
    : [];
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

  const signalCount = asNumber(diamond?.signal_count);
  const suitable = asBoolean(diamond?.suitable);
  const aside =
    signalCount != null || suitable != null ? (
      <BadgeRow>
        {signalCount != null && (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.diamondSignalCount', {
              defaultMessage: '{count} signals',
              values: { count: signalCount },
            })}
          </EuiBadge>
        )}
        {suitable != null && (
          <EuiBadge color={suitable ? 'success' : 'hollow'}>
            {suitable ? suitableBadge : notSuitableBadge}
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
              signal={asString(diamond?.[vertex]?.signal)}
              summary={asString(diamond?.[vertex]?.summary)}
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
  const evidence = asRecord(liveData.evidence);
  const rankScore = asNumber(liveData.rank_score);
  if (!evidence && rankScore == null) {
    return null;
  }

  const corroboratedRank = asNumber(evidence?.corroborated_rank_score);
  const alertHitsTotal = asNumber(evidence?.alert_hits_total);
  const lastHuntStatus = asString(evidence?.last_hunt_status);
  const lastHuntedAt = asString(evidence?.last_hunted_at);
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
  if (alertHitsTotal != null) {
    stats.push({
      title: alertHitsTotal,
      description: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.alertHits', {
        defaultMessage: 'Alert hits',
      }),
    });
  }
  if (lastHuntStatus != null) {
    stats.push({
      title: (
        <EuiBadge color={lastHuntStatus === 'environment_hits_found' ? 'warning' : 'hollow'}>
          {HUNT_STATUS_LABELS[lastHuntStatus] ?? lastHuntStatus}
        </EuiBadge>
      ),
      description: i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.threat.lastHuntStatus',
        { defaultMessage: 'Last hunt status' }
      ),
    });
  }
  if (lastHuntedAt != null) {
    stats.push({
      title: <FormattedRelative value={lastHuntedAt} />,
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

const renderHeadlineSection = (liveData: ThreatReportApiResponse): React.ReactNode => {
  const title = asString(liveData.content?.title);
  const severity = asString(liveData.severity?.level);
  const source = asString(liveData.source?.name);

  // Decided here rather than inside `ThreatHeadline`, so that an empty headline is absent
  // rather than an element that renders nothing. `renderEnrichedSections` counts sections to
  // tell whether the live report has anything to show, and cannot see inside a component.
  if (!title && !severity && !source) {
    return null;
  }

  return (
    <ThreatHeadline
      key="headline"
      title={title}
      severity={severity}
      source={source}
      testSubj="alertzeroThreatAttachmentHeadline"
    />
  );
};

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

  // One shared fallback path covers 404, 503, and route-absent cases. A denied read is the one
  // case that branches: the route enforces report access and the captured snapshot does not, so
  // showing the snapshot after a denial would present details this viewer was just refused.
  //
  // This is hygiene, not an authorization boundary. The snapshot lives in the attachment payload
  // the browser has already received, and the server's `format` puts the same fields into the
  // agent's context, so a real boundary has to be enforced where the payload is written or
  // read, not here.
  const isForbidden = isHttpForbidden(error);
  const fetchSucceeded = !isLoading && !error && liveData != null;

  // Rendered up front rather than inline below, because whether there is anything to show
  // decides the branch. A 200 carrying nothing but `reportId` is a valid response — a report
  // seeded but not yet enriched looks exactly like that — and every section would then render
  // as null, leaving an empty panel. Falling back keeps the captured fields visible instead.
  const liveSections = fetchSucceeded ? renderEnrichedSections({ liveData, navigation }) : null;
  const liveIsEmpty = fetchSucceeded && liveSections == null;

  // Narrowed individually rather than by parsing the whole schema up front, so one unusable
  // captured field cannot suppress the others or the live report. Same reasoning as the live
  // response: a wrong-typed value reads as absent instead of reaching React as a non-child.
  const capturedTitle = asString(data.title);
  const capturedSeverity = asString(data.severity);
  const capturedSource = asString(data.source);
  const hasAnyField = !isForbidden && Boolean(capturedTitle || capturedSeverity || capturedSource);

  // A resolved-but-empty report is a different situation from an unresolvable one, so it does
  // not claim the report could not be resolved. The captured fields, when there are any,
  // render below this either way.
  const fallbackTitle = isForbidden
    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.forbidden', {
        defaultMessage: 'You do not have access to this report.',
      })
    : liveIsEmpty
    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.liveEmpty', {
        defaultMessage: 'This report has no details to show yet.',
      })
    : hasAnyField
    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.captured', {
        defaultMessage: 'Showing captured fields. The live report could not be resolved.',
      })
    : i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.unavailable', {
        defaultMessage: 'Report unavailable',
      });

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
          {liveSections}
          {liveSections == null && (
            <>
              <KbnInfoCallout
                announceOnMount
                size="s"
                data-test-subj={THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID}
                title={fallbackTitle}
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
                          capturedTitle,
                        ],
                        [
                          i18n.translate(
                            'xpack.alertzero.agentBuilder.attachments.threat.capturedSeverity',
                            { defaultMessage: 'Severity' }
                          ),
                          capturedSeverity ? (
                            <EuiBadge color={severityBadgeColor(capturedSeverity)}>
                              {capturedSeverity}
                            </EuiBadge>
                          ) : undefined,
                        ],
                        [
                          i18n.translate(
                            'xpack.alertzero.agentBuilder.attachments.threat.capturedSource',
                            { defaultMessage: 'Source' }
                          ),
                          capturedSource,
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
