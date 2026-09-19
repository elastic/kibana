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
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  buildThreatReportIocSetHashLookupEsql,
  buildThreatReportLookupEsql,
  buildThreatReportsInEsql,
  DiscoverLink,
} from '../navigation';
import { EntityChip } from '../entity_chip';
import { parseHuntCorrelationData } from './types';
import type { Anchor, DiamondScore, HuntCorrelationAttachment } from './types';

export interface HuntCorrelationInlineContentProps
  extends AttachmentRenderProps<HuntCorrelationAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const HUNT_CORRELATION_ATTACHMENT_TEST_ID = 'alertzeroHuntCorrelationAttachment';
export const HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroHuntCorrelationAttachmentEmpty';

const HASH_LIKE_ANCHOR_KINDS = new Set<Anchor['kind']>(['hash', 'ioc_set_hash']);

const cellStyles = css`
  overflow-wrap: anywhere;
`;

const getUniqueRelatedReportIds = (diamondScores: DiamondScore[]): string[] => [
  ...new Set(diamondScores.map((score) => score.related_report_id)),
];

const renderAnchorValue = ({
  kind,
  value,
  index,
  navigation,
  relatedReportIds,
}: {
  kind: Anchor['kind'];
  value: string;
  index: number;
  navigation: AttachmentNavigationDeps;
  relatedReportIds: string[];
}): React.ReactNode => {
  const badge = (
    <EuiBadge color="hollow" css={{ marginRight: 4 }}>
      {value}
    </EuiBadge>
  );

  if (!HASH_LIKE_ANCHOR_KINDS.has(kind)) {
    if (kind === 'actor') {
      return (
        <EntityChip
          entity={value}
          kindOverride="actor"
          share={navigation.share}
          testSubj={`alertzeroHuntCorrelationActorChip-${index}`}
        />
      );
    }
    return badge;
  }

  // Hash correlation anchors are report-only. Enrichment often replaces seeded
  // extracted.iocs, so the hash value may not exist on any report document.
  // Prefer opening the related reports from this correlation (same exit as the
  // action button). Fall back to a nested IOC filter when no related ids exist.
  let href: string | undefined;
  if (kind === 'hash') {
    const relatedEsql = buildThreatReportsInEsql({ reportIds: relatedReportIds });
    href = relatedEsql
      ? buildDiscoverEsqlUrl({ share: navigation.share, esql: relatedEsql })
      : buildDiscoverThreatReportNestedIocUrl({
          share: navigation.share,
          iocType: 'hash',
          value,
        });
  } else {
    const esql = buildThreatReportIocSetHashLookupEsql({ value });
    href = esql ? buildDiscoverEsqlUrl({ share: navigation.share, esql }) : undefined;
  }

  return (
    <span css={{ marginRight: 4 }}>
      <DiscoverLink href={href} testSubj={`alertzeroHuntCorrelationAnchorLink-${kind}-${index}`}>
        {badge}
      </DiscoverLink>
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
        hasShadow={false}
        hasBorder
        paddingSize="m"
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

  const uniqueRelatedReportIds = getUniqueRelatedReportIds(parsed.diamondScores);

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={HUNT_CORRELATION_ATTACHMENT_TEST_ID}
    >
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.heroSummary', {
          defaultMessage: '{anchorCount} anchors · {reportCount} related reports',
          values: {
            anchorCount: parsed.anchors.length,
            reportCount: uniqueRelatedReportIds.length,
          },
        })}
      </EuiText>

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchors', {
            defaultMessage: 'Anchors',
          })}
        </strong>
      </EuiText>
      {parsed.anchors.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorsEmpty', {
            defaultMessage: 'No anchors recorded',
          })}
        </EuiText>
      ) : (
        [...anchorsByKind.entries()].map(([kind, values]) => (
          <div key={kind} css={{ marginBottom: 4 }}>
            <EuiText size="xs" color="subdued" css={cellStyles}>
              {kind}
            </EuiText>
            {values.map((value, index) => (
              <React.Fragment key={`${kind}-${value}-${index}`}>
                {renderAnchorValue({
                  kind,
                  value,
                  index,
                  navigation,
                  relatedReportIds: uniqueRelatedReportIds,
                })}
              </React.Fragment>
            ))}
          </div>
        ))
      )}

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScores',
            { defaultMessage: 'Diamond scores' }
          )}
        </strong>
      </EuiText>
      {parsed.diamondScores.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresEmpty',
            { defaultMessage: 'No diamond scores recorded' }
          )}
        </EuiText>
      ) : (
        <EuiBasicTable<DiamondScore>
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresTableCaption',
            { defaultMessage: 'Diamond model correlation scores' }
          )}
          items={parsed.diamondScores}
          columns={[
            {
              field: 'vertex',
              name: i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertex',
                { defaultMessage: 'Vertex' }
              ),
            },
            {
              field: 'related_report_id',
              name: i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.relatedReport',
                { defaultMessage: 'Related report' }
              ),
              render: (relatedReportId: string) => {
                const esql = buildThreatReportLookupEsql({ reportId: relatedReportId });
                const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
                return (
                  <DiscoverLink
                    href={href}
                    testSubj={`alertzeroHuntCorrelationRelatedReportLink-${relatedReportId}`}
                  >
                    <span css={cellStyles}>{relatedReportId}</span>
                  </DiscoverLink>
                );
              },
            },
            {
              field: 'score',
              name: i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.score',
                { defaultMessage: 'Score' }
              ),
            },
          ]}
        />
      )}

      {parsed.thresholds && (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={[
              {
                title: i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorMatch',
                  { defaultMessage: 'Anchor match' }
                ),
                description: (
                  <EuiText size="xs" color="subdued">
                    {parsed.thresholds.anchor_match}
                  </EuiText>
                ),
              },
              {
                title: i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondVertex',
                  { defaultMessage: 'Diamond vertex' }
                ),
                description: (
                  <EuiText size="xs" color="subdued">
                    {parsed.thresholds.diamond_vertex}
                  </EuiText>
                ),
              },
            ]}
          />
        </>
      )}
    </EuiPanel>
  );
};
