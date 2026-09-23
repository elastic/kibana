/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { groupBy } from 'lodash';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildActorLookupEsql,
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  buildThreatReportIocSetHashLookupEsql,
  buildThreatReportLookupEsql,
} from '../navigation';
import { IocBadge, discoverAction } from '../shared/ioc_badge';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import type { LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { DIAMOND_VERTICES, formatPercent } from '../shared/severity';
import { Section, SectionStack, MetaCard, AttachmentEmptyState } from '../shared/primitives';
import {
  buildHuntCorrelationActionButtons,
  buildHuntCorrelationSummary,
  parseHuntCorrelationData,
} from './view_model';
import type { Anchor, DiamondScore, HuntCorrelationAttachment } from './view_model';

export interface HuntCorrelationInlineContentProps
  extends AttachmentRenderProps<HuntCorrelationAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const HUNT_CORRELATION_ATTACHMENT_TEST_ID = 'alertzeroHuntCorrelationAttachment';
export const HUNT_CORRELATION_ATTACHMENT_SUMMARY_TEST_ID =
  'alertzeroHuntCorrelationAttachmentSummary';
export const HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroHuntCorrelationAttachmentEmpty';

const HASH_LIKE_ANCHOR_KINDS = new Set<Anchor['kind']>(['hash', 'ioc_set_hash']);

/** Human labels for anchor kinds; unknown kinds fall back to the raw value. */
const ANCHOR_KIND_LABELS: Partial<Record<Anchor['kind'], string>> = {
  actor: i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorActor', {
    defaultMessage: 'Actor',
  }),
  hash: i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorHash', {
    defaultMessage: 'Hash',
  }),
  ioc_set_hash: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorIocSetHash',
    { defaultMessage: 'IOC set hash' }
  ),
};

const VERTEX_LABELS: Record<DiamondScore['vertex'], string> = {
  adversary: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexAdversary',
    { defaultMessage: 'Adversary' }
  ),
  capability: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexCapability',
    { defaultMessage: 'Capability' }
  ),
  infrastructure: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexInfrastructure',
    { defaultMessage: 'Infrastructure' }
  ),
  victim: i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexVictim', {
    defaultMessage: 'Victim',
  }),
};

interface DiamondScoreRow {
  id: string;
  relatedReportId: string;
  scoresByVertex: Partial<Record<DiamondScore['vertex'], number>>;
}

const groupDiamondScoresByReport = (diamondScores: DiamondScore[]): DiamondScoreRow[] => {
  const scoresByReportId = groupBy(diamondScores, (score) => score.related_report_id);
  return Object.entries(scoresByReportId).map(([relatedReportId, scores]) => ({
    id: relatedReportId,
    relatedReportId,
    scoresByVertex: Object.fromEntries(scores.map((score) => [score.vertex, score.score])),
  }));
};

const renderAnchorValue = ({
  kind,
  value,
  index,
  navigation,
}: {
  kind: Anchor['kind'];
  value: string;
  index: number;
  navigation: AttachmentNavigationDeps;
}): React.ReactNode => {
  if (kind === 'actor') {
    const esql = buildActorLookupEsql({ value, spaceId: navigation.spaceId });
    const href = esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined;
    return (
      <IocBadge
        value={value}
        index={index}
        action={discoverAction(href)}
        testSubj={`alertzeroHuntCorrelationActorChip-${index}`}
      />
    );
  }

  if (!HASH_LIKE_ANCHOR_KINDS.has(kind)) {
    return <IocBadge value={value} index={index} />;
  }

  // Hash anchors query the hash on threat reports (`extracted.iocs`), not related
  // report ids and not invented logs-* / file.hash.* fields.
  // ioc_set_hash lives as a top-level report field.
  if (kind === 'hash') {
    const href = buildDiscoverThreatReportNestedIocUrl({
      share: navigation.share,
      iocType: 'hash',
      value,
      spaceId: navigation.spaceId,
    });
    return (
      <IocBadge
        value={value}
        index={index}
        action={discoverAction(href)}
        testSubj={`alertzeroHuntCorrelationAnchorLink-${kind}-${index}`}
      />
    );
  }

  const esql = buildThreatReportIocSetHashLookupEsql({ value, spaceId: navigation.spaceId });
  const href = esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined;
  return (
    <IocBadge
      value={value}
      index={index}
      action={discoverAction(href)}
      testSubj={`alertzeroHuntCorrelationAnchorLink-${kind}-${index}`}
    />
  );
};

const ThresholdTip: React.FC<{ message: string }> = ({ message }) => (
  <EuiIconTip content={message} aria-label={message} position="right" size="s" />
);

/** One vertex score: percentage on top of a thin bar; green once it clears the threshold. */
const VertexScoreCard: React.FC<{
  vertex: DiamondScore['vertex'];
  score?: number;
  threshold?: number;
}> = ({ vertex, score, threshold }) => {
  const { euiTheme } = useEuiTheme();
  const isAboveThreshold = score !== undefined && threshold !== undefined && score >= threshold;
  return (
    <MetaCard
      label={VERTEX_LABELS[vertex]}
      testSubj={`alertzeroHuntCorrelationVertexScore-${vertex}`}
    >
      {score === undefined ? (
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexNotAvailable',
            { defaultMessage: 'n/a' }
          )}
        </EuiText>
      ) : (
        <>
          <EuiText
            size="s"
            color={isAboveThreshold ? 'success' : 'default'}
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              font-variant-numeric: tabular-nums;
            `}
          >
            {formatPercent(score)}
          </EuiText>
          <EuiProgress
            size="xs"
            max={1}
            value={score}
            color={isAboveThreshold ? 'success' : 'subdued'}
            css={{ marginTop: euiTheme.size.xs }}
          />
        </>
      )}
    </MetaCard>
  );
};

/** Scores for one related report: report badge on top, one card per Diamond vertex below. */
const RelatedReportScores: React.FC<{
  row: DiamondScoreRow;
  threshold?: number;
  navigation: AttachmentNavigationDeps;
}> = ({ row, threshold, navigation }) => {
  const esql = buildThreatReportLookupEsql({
    reportId: row.relatedReportId,
    spaceId: navigation.spaceId,
  });
  const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
  const scores = Object.values(row.scoresByVertex);
  // "All above" needs every vertex scored; an unscored vertex renders n/a and must not count.
  const allAbove =
    threshold !== undefined &&
    DIAMOND_VERTICES.every((vertex) => {
      const score = row.scoresByVertex[vertex];
      return score !== undefined && score >= threshold;
    });

  return (
    <div css={{ minWidth: 0 }}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.huntCorrelation.relatedReport',
              { defaultMessage: 'Related report' }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 0, maxWidth: '100%' }}>
          <IocBadge
            value={row.relatedReportId}
            action={discoverAction(href)}
            testSubj={`alertzeroHuntCorrelationRelatedReportLink-${row.relatedReportId}`}
          />
        </EuiFlexItem>
        {threshold !== undefined && scores.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={allAbove ? 'success' : 'hollow'}>
              {allAbove
                ? i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.reportAboveThreshold',
                    { defaultMessage: 'All vertices above threshold' }
                  )
                : i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.reportBelowThreshold',
                    { defaultMessage: 'Some vertices below threshold or unscored' }
                  )}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        {DIAMOND_VERTICES.map((vertex) => (
          <EuiFlexItem key={vertex} css={{ minWidth: 120 }}>
            <VertexScoreCard
              vertex={vertex}
              score={row.scoresByVertex[vertex]}
              threshold={threshold}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};

export const HuntCorrelationInlineContent: React.FC<HuntCorrelationInlineContentProps> = ({
  attachment,
  navigation,
}) => {
  const parsed = parseHuntCorrelationData(attachment?.data);

  if (!parsed) {
    return (
      <AttachmentEmptyState
        testSubj={HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID}
        message={i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.empty', {
          defaultMessage: 'No hunt correlation data available',
        })}
      />
    );
  }

  const anchorsByKind: Record<string, Anchor[]> = groupBy(parsed.anchors, (anchor) => anchor.kind);

  const anchorRows: LabeledBadgeTableRow[] = Object.entries(anchorsByKind).map(
    ([kind, anchors]) => ({
      id: kind,
      label: ANCHOR_KIND_LABELS[kind as Anchor['kind']] ?? kind,
      values: (
        <>
          {anchors.map((anchor, index) => (
            <React.Fragment key={`${kind}-${anchor.value}-${index}`}>
              {renderAnchorValue({ kind: anchor.kind, value: anchor.value, index, navigation })}
            </React.Fragment>
          ))}
        </>
      ),
    })
  );

  const diamondScoreRows = groupDiamondScoresByReport(parsed.diamond_scores);
  const diamondVertexThreshold = parsed.thresholds?.diamond_vertex;

  const summary = buildHuntCorrelationSummary(parsed);
  const hasChromeHeader = buildHuntCorrelationActionButtons({ parsed, navigation }).length > 0;

  const anchorsTitle = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchors',
    { defaultMessage: 'Anchors' }
  );
  const diamondTitle = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScores',
    { defaultMessage: 'Diamond scores' }
  );

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      data-test-subj={HUNT_CORRELATION_ATTACHMENT_TEST_ID}
    >
      <SectionStack>
        {!hasChromeHeader && (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            wrap
            responsive={false}
            data-test-subj={HUNT_CORRELATION_ATTACHMENT_SUMMARY_TEST_ID}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">{summary.subtitle}</EuiText>
            </EuiFlexItem>
            {summary.thresholdLabel && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={summary.allAboveThreshold ? 'success' : 'hollow'}>
                  {summary.thresholdLabel}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}

        <Section
          title={anchorsTitle}
          suffix={
            parsed.thresholds && (
              <ThresholdTip
                message={i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorMatchTooltip',
                  {
                    defaultMessage: 'Anchor match threshold {threshold}',
                    values: { threshold: parsed.thresholds.anchor_match },
                  }
                )}
              />
            )
          }
        >
          {parsed.anchors.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorsEmpty',
                { defaultMessage: 'No anchors recorded' }
              )}
            </EuiText>
          ) : (
            <LabeledBadgeTable
              rows={anchorRows}
              caption={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorsTableCaption',
                { defaultMessage: 'Hunt correlation anchors' }
              )}
            />
          )}
        </Section>

        <Section
          title={diamondTitle}
          suffix={
            diamondVertexThreshold !== undefined && (
              <ThresholdTip
                message={i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexThresholdTooltip',
                  {
                    defaultMessage: 'Vertex threshold {threshold}',
                    values: { threshold: diamondVertexThreshold },
                  }
                )}
              />
            )
          }
          aside={
            diamondVertexThreshold !== undefined ? (
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexThresholdAside',
                  {
                    defaultMessage: 'Threshold {threshold}',
                    values: { threshold: formatPercent(diamondVertexThreshold) },
                  }
                )}
              </EuiText>
            ) : undefined
          }
        >
          {diamondScoreRows.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresEmpty',
                { defaultMessage: 'No diamond scores recorded' }
              )}
            </EuiText>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              {diamondScoreRows.map((row) => (
                <EuiFlexItem key={row.id} css={{ minWidth: 0 }}>
                  <RelatedReportScores
                    row={row}
                    threshold={diamondVertexThreshold}
                    navigation={navigation}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </Section>
      </SectionStack>
    </EuiPanel>
  );
};
