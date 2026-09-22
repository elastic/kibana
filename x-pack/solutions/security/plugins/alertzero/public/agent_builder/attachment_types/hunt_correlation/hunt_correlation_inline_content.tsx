/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { groupBy } from 'lodash';
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
import { IocBadge, OPEN_IN_DISCOVER_LABEL } from '../shared/ioc_badge';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import type { LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { DIAMOND_VERTICES, formatPercent } from '../shared/severity';
import { SectionHeading } from '../shared/section_heading';
import { AttachmentEmptyState } from '../shared/attachment_empty_state';
import { parseHuntCorrelationData } from './types';
import type { Anchor, DiamondScore, HuntCorrelationAttachment } from './types';

export interface HuntCorrelationInlineContentProps
  extends AttachmentRenderProps<HuntCorrelationAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const HUNT_CORRELATION_ATTACHMENT_TEST_ID = 'alertzeroHuntCorrelationAttachment';
export const HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroHuntCorrelationAttachmentEmpty';

const HASH_LIKE_ANCHOR_KINDS = new Set<Anchor['kind']>(['hash', 'ioc_set_hash']);

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
    const href = esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined;
    return (
      <IocBadge
        value={value}
        index={index}
        action={href ? { href, iconType: 'discoverApp', label: OPEN_IN_DISCOVER_LABEL } : undefined}
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
    });
    return (
      <span data-test-subj={`alertzeroHuntCorrelationAnchorLink-${kind}-${index}`}>
        <IocBadge
          value={value}
          index={index}
          action={
            href ? { href, iconType: 'discoverApp', label: OPEN_IN_DISCOVER_LABEL } : undefined
          }
        />
      </span>
    );
  }

  const esql = buildThreatReportIocSetHashLookupEsql({ value });
  const href = esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined;
  return (
    <span data-test-subj={`alertzeroHuntCorrelationAnchorLink-${kind}-${index}`}>
      <IocBadge
        value={value}
        index={index}
        action={href ? { href, iconType: 'discoverApp', label: OPEN_IN_DISCOVER_LABEL } : undefined}
      />
    </span>
  );
};

const ThresholdTip: React.FC<{ message: string }> = ({ message }) => (
  <EuiIconTip content={message} aria-label={message} position="right" />
);

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
      label: kind,
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
            action={
              href ? { href, iconType: 'discoverApp', label: OPEN_IN_DISCOVER_LABEL } : undefined
            }
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
      <SectionHeading
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
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchors', {
          defaultMessage: 'Anchors',
        })}
      </SectionHeading>
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
      <SectionHeading
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
      >
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScores', {
          defaultMessage: 'Diamond scores',
        })}
      </SectionHeading>
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
