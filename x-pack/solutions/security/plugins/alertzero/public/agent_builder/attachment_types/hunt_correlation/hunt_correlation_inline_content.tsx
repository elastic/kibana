/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiIconTip,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
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
import { IocBadge } from '../shared/ioc_badge';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import type { LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { formatPercent } from '../shared/severity';
import { parseHuntCorrelationData } from './types';
import type { Anchor, DiamondScore, HuntCorrelationAttachment } from './types';

export interface HuntCorrelationInlineContentProps
  extends AttachmentRenderProps<HuntCorrelationAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const HUNT_CORRELATION_ATTACHMENT_TEST_ID = 'alertzeroHuntCorrelationAttachment';
export const HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroHuntCorrelationAttachmentEmpty';

const HASH_LIKE_ANCHOR_KINDS = new Set<Anchor['kind']>(['hash', 'ioc_set_hash']);

const DIAMOND_VERTICES: DiamondScore['vertex'][] = [
  'adversary',
  'capability',
  'infrastructure',
  'victim',
];

interface DiamondScoreRow {
  id: string;
  relatedReportId: string;
  scoresByVertex: Partial<Record<DiamondScore['vertex'], number>>;
}

const groupDiamondScoresByReport = (diamondScores: DiamondScore[]): DiamondScoreRow[] => {
  const rowsByReportId = new Map<string, DiamondScoreRow>();
  for (const score of diamondScores) {
    let row = rowsByReportId.get(score.related_report_id);
    if (!row) {
      row = {
        id: score.related_report_id,
        relatedReportId: score.related_report_id,
        scoresByVertex: {},
      };
      rowsByReportId.set(score.related_report_id, row);
    }
    row.scoresByVertex[score.vertex] = score.score;
  }
  return [...rowsByReportId.values()];
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
    const esql = buildActorLookupEsql({ value });
    return (
      <IocBadge
        value={value}
        index={index}
        discoverHref={esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined}
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
  const href =
    kind === 'hash'
      ? buildDiscoverThreatReportNestedIocUrl({
          share: navigation.share,
          iocType: 'hash',
          value,
        })
      : (() => {
          const esql = buildThreatReportIocSetHashLookupEsql({ value });
          return esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined;
        })();

  return (
    <span data-test-subj={`alertzeroHuntCorrelationAnchorLink-${kind}-${index}`}>
      <IocBadge value={value} index={index} discoverHref={href} />
    </span>
  );
};

export const HuntCorrelationInlineContent: React.FC<HuntCorrelationInlineContentProps> = ({
  attachment,
  navigation,
}) => {
  const parsed = parseHuntCorrelationData(attachment?.data);

  if (!parsed) {
    return (
      <EuiPanel
        hasBorder={false}
        paddingSize="s"
        data-test-subj={HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.empty', {
            defaultMessage: 'No hunt correlation data available',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  const anchorsByKind = new Map<Anchor['kind'], string[]>();
  for (const anchor of parsed.anchors) {
    const values = anchorsByKind.get(anchor.kind) ?? [];
    values.push(anchor.value);
    anchorsByKind.set(anchor.kind, values);
  }

  const anchorRows: LabeledBadgeTableRow[] = [...anchorsByKind.entries()].map(([kind, values]) => ({
    id: kind,
    label: kind,
    values: (
      <>
        {values.map((value, index) => (
          <React.Fragment key={`${kind}-${value}-${index}`}>
            {renderAnchorValue({ kind, value, index, navigation })}
          </React.Fragment>
        ))}
      </>
    ),
  }));

  const diamondScoreRows = groupDiamondScoresByReport(parsed.diamond_scores);
  const diamondVertexThreshold = parsed.thresholds?.diamond_vertex;

  const diamondColumns: Array<EuiBasicTableColumn<DiamondScoreRow>> = [
    {
      field: 'relatedReportId',
      name: i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.huntCorrelation.relatedReport',
        { defaultMessage: 'Related report' }
      ),
      render: (relatedReportId: string) => {
        const esql = buildThreatReportLookupEsql({ reportId: relatedReportId });
        const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
        return (
          <IocBadge
            value={relatedReportId}
            index={0}
            discoverHref={href}
            testSubj={`alertzeroHuntCorrelationRelatedReportLink-${relatedReportId}`}
          />
        );
      },
    },
    ...DIAMOND_VERTICES.map(
      (vertex): EuiBasicTableColumn<DiamondScoreRow> => ({
        field: 'scoresByVertex',
        name: vertex,
        width: '7em',
        render: (_value: unknown, row: DiamondScoreRow) => {
          const score = row.scoresByVertex[vertex];
          if (score === undefined) {
            return (
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexNotAvailable',
                  { defaultMessage: 'n/a' }
                )}
              </EuiText>
            );
          }
          const isAboveThreshold =
            diamondVertexThreshold !== undefined && score >= diamondVertexThreshold;
          return (
            <EuiProgress
              size="s"
              max={1}
              value={score}
              valueText={formatPercent(score)}
              color={isAboveThreshold ? 'success' : 'subdued'}
            />
          );
        },
      })
    ),
  ];

  return (
    <EuiPanel
      hasBorder={false}
      paddingSize="s"
      data-test-subj={HUNT_CORRELATION_ATTACHMENT_TEST_ID}
    >
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchors', {
            defaultMessage: 'Anchors',
          })}
        </strong>{' '}
        {parsed.thresholds &&
          (() => {
            const anchorMatchTooltip = i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorMatchTooltip',
              {
                defaultMessage: 'Anchor match threshold {threshold}',
                values: { threshold: parsed.thresholds.anchor_match },
              }
            );
            return (
              <EuiIconTip
                content={anchorMatchTooltip}
                aria-label={anchorMatchTooltip}
                position="right"
              />
            );
          })()}
      </EuiText>
      {parsed.anchors.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorsEmpty', {
            defaultMessage: 'No anchors recorded',
          })}
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

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScores',
            { defaultMessage: 'Diamond scores' }
          )}
        </strong>{' '}
        {diamondVertexThreshold !== undefined &&
          (() => {
            const vertexThresholdTooltip = i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertexThresholdTooltip',
              {
                defaultMessage: 'Vertex threshold {threshold}',
                values: { threshold: diamondVertexThreshold },
              }
            );
            return (
              <EuiIconTip
                content={vertexThresholdTooltip}
                aria-label={vertexThresholdTooltip}
                position="right"
              />
            );
          })()}
      </EuiText>
      {diamondScoreRows.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresEmpty',
            { defaultMessage: 'No diamond scores recorded' }
          )}
        </EuiText>
      ) : (
        <EuiBasicTable<DiamondScoreRow>
          tableLayout="auto"
          responsiveBreakpoint={false}
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresTableCaption',
            { defaultMessage: 'Diamond model correlation scores' }
          )}
          items={diamondScoreRows}
          itemId="id"
          columns={diamondColumns}
        />
      )}
    </EuiPanel>
  );
};
