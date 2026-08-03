/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { MitreHeatmapPayload } from '../../../../common/threat_intelligence/hub';

const SEVERITY_COLOR: Record<
  MitreHeatmapPayload['techniques'][number]['severity_max'],
  'success' | 'warning' | 'danger' | 'subdued'
> = {
  low: 'subdued',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const COVERAGE_BADGE_COLOR = (
  recommendation: MitreHeatmapPayload['techniques'][number]['coverage_recommendation'],
  hasCoverage: boolean | undefined
): 'success' | 'warning' | 'danger' | 'subdued' => {
  if (recommendation === 'covered' || hasCoverage === true) {
    return 'success';
  }
  if (recommendation === 'enable_existing') {
    return 'warning';
  }
  if (recommendation === 'create_rule' || hasCoverage === false) {
    return 'danger';
  }
  return 'subdued';
};

type HeatmapAttachment = Attachment<'threat-intel-mitre-heatmap', MitreHeatmapPayload>;

export const mitreHeatmapUiDefinition: AttachmentUIDefinition<HeatmapAttachment> = {
  getLabel: (attachment) => {
    const isCoverage = attachment.data?.mode === 'coverage';
    return (
      attachment.data?.attachmentLabel ??
      (isCoverage
        ? i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.labelCoverage',
            {
              defaultMessage: 'MITRE coverage heatmap',
            }
          )
        : i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.label',
            {
              defaultMessage: 'MITRE technique heatmap',
            }
          ))
    );
  },
  getIcon: () => 'reportingApp',
  renderInlineContent: ({ attachment }) => {
    const { time_range_label: range, techniques, mode } = attachment.data;
    const isCoverage = mode === 'coverage';
    const top = [...techniques].sort((a, b) => b.article_count - a.article_count).slice(0, 12);
    const uncoveredCount = isCoverage
      ? techniques.filter(
          (t) =>
            t.coverage_recommendation === 'create_rule' ||
            (t.coverage_recommendation == null && t.has_coverage === false)
        ).length
      : 0;
    const enableExistingCount = isCoverage
      ? techniques.filter((t) => t.coverage_recommendation === 'enable_existing').length
      : 0;
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h4>
            {isCoverage
              ? i18n.translate(
                  'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.titleCoverage',
                  {
                    defaultMessage: 'MITRE coverage heatmap',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.title',
                  {
                    defaultMessage: 'MITRE technique heatmap',
                  }
                )}
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {range}
          {isCoverage
            ? ` · ${i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.coverageSummary',
                {
                  defaultMessage:
                    '{uncovered} uncovered, {enableExisting} to enable of {total} in-wild technique(s)',
                  values: {
                    uncovered: uncoveredCount,
                    enableExisting: enableExistingCount,
                    total: techniques.length,
                  },
                }
              )}`
            : null}
        </EuiText>
        <EuiSpacer size="s" />
        {techniques.length === 0 ? (
          <EuiText size="s">
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.empty',
              {
                defaultMessage: 'No techniques observed in this window.',
              }
            )}
          </EuiText>
        ) : (
          <EuiFlexGrid columns={3} gutterSize="s">
            {top.map((t) => {
              const showCoverageBadge = isCoverage && typeof t.has_coverage === 'boolean';
              return (
                <EuiFlexItem key={t.technique_id}>
                  <EuiPanel hasShadow={false} hasBorder paddingSize="s">
                    <EuiText size="xs">
                      <strong>{t.technique_id}</strong>
                      {' · '}
                      {t.name}
                    </EuiText>
                    <EuiSpacer size="xs" />
                    {showCoverageBadge ? (
                      <EuiBadge
                        color={COVERAGE_BADGE_COLOR(t.coverage_recommendation, t.has_coverage)}
                      >
                        {t.coverage_recommendation === 'enable_existing'
                          ? i18n.translate(
                              'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.enableExistingBadge',
                              {
                                defaultMessage:
                                  'enable existing · {ruleCount} disabled rule(s) · {articleCount} report(s)',
                                values: {
                                  ruleCount: t.matching_disabled_rule_count ?? 0,
                                  articleCount: t.article_count,
                                },
                              }
                            )
                          : t.has_coverage || t.coverage_recommendation === 'covered'
                          ? i18n.translate(
                              'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.coveredBadge',
                              {
                                defaultMessage:
                                  'covered · {ruleCount} rule(s) · {articleCount} report(s)',
                                values: {
                                  ruleCount: t.matching_rule_count ?? 0,
                                  articleCount: t.article_count,
                                },
                              }
                            )
                          : i18n.translate(
                              'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.uncoveredBadge',
                              {
                                defaultMessage: 'uncovered · {articleCount} report(s)',
                                values: { articleCount: t.article_count },
                              }
                            )}
                      </EuiBadge>
                    ) : (
                      <EuiBadge color={SEVERITY_COLOR[t.severity_max]}>
                        {i18n.translate(
                          'xpack.securitySolution.threatIntelligence.attachments.mitreHeatmap.severityBadge',
                          {
                            defaultMessage:
                              '{severity} · {articleCount} {articleCount, plural, one {report} other {reports}}',
                            values: {
                              severity: t.severity_max,
                              articleCount: t.article_count,
                            },
                          }
                        )}
                      </EuiBadge>
                    )}
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
        )}
      </EuiPanel>
    );
  },
};
