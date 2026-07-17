/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '../../../../common/lib/kibana';
import { deployEsqlRule } from '../lib/deploy_esql_rule';
import { getEsqlDiscoverUrl } from '../lib/open_esql_in_discover';

export interface HuntFindingListItem {
  id: string;
  '@timestamp': string;
  report_id: string;
  report_title?: string;
  technique_id: string;
  technique_name?: string;
  hypothesis: string;
  hypothesis_rationale?: string;
  confidence: number;
  severity: string;
  risk_score: number;
  proposed_esql_rule: string;
  rule_name?: string;
  affected_assets: {
    hosts: string[];
    users: string[];
  };
}

export interface FeedbackLoopSummary {
  report_id: string;
  title: string;
  rank_score: number;
  corroborated_rank_score: number;
}

interface Props {
  findings: HuntFindingListItem[];
  feedbackLoop?: FeedbackLoopSummary[];
  isLoading: boolean;
  onHighlightReport: (reportId: string) => void;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
}

const HuntFindingsPanelComponent: React.FC<Props> = ({
  findings,
  feedbackLoop,
  isLoading,
  onHighlightReport,
  http,
  notifications,
  application,
}) => {
  const { share } = useKibana().services;
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const [creatingRuleId, setCreatingRuleId] = useState<string | undefined>();

  const handleCreateRule = useCallback(
    async (finding: HuntFindingListItem) => {
      setCreatingRuleId(finding.id);
      try {
        const result = await deployEsqlRule(http, {
          name:
            finding.rule_name ||
            `TI hunt: ${finding.technique_id}${
              finding.technique_name ? ` ${finding.technique_name}` : ''
            }`,
          description:
            finding.hypothesis_rationale ||
            finding.hypothesis ||
            'Created from continuous threat hunt finding.',
          query: finding.proposed_esql_rule,
          severity: finding.severity,
          riskScore: finding.risk_score,
          tags: ['threat-intel', `mitre:${finding.technique_id}`],
        });
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsCreateRuleSuccessTitle',
            { defaultMessage: 'Detection rule created (disabled)' }
          ),
          text: i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsCreateRuleSuccessBody',
            {
              defaultMessage: 'Rule "{name}" is ready to review before enabling.',
              values: { name: result.ruleName },
            }
          ),
        });
        await application.navigateToApp('securitySolutionUI', {
          deepLinkId: 'rules',
          path: `/id/${result.ruleId}`,
        });
      } catch (err) {
        notifications.toasts.addError(err as Error, {
          title: i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsCreateRuleErrorTitle',
            { defaultMessage: 'Failed to create detection rule' }
          ),
        });
      } finally {
        setCreatingRuleId(undefined);
      }
    },
    [application, http, notifications]
  );

  const handleOpenInDiscover = useCallback(
    (esql: string) => {
      const url = getEsqlDiscoverUrl(share, esql);
      if (!url) {
        notifications.toasts.addDanger(
          i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsOpenDiscoverError',
            { defaultMessage: 'Unable to open Discover for this ES|QL query.' }
          )
        );
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [notifications.toasts, share]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="threatIntelHuntFindingsPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.huntFindingsTitle', {
            defaultMessage: 'Hunt findings',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.securitySolution.threatIntelligence.app.huntFindingsDescription', {
          defaultMessage:
            'Durable results from continuous and on-demand hunts. Continuous hunt runs every 4h.',
        })}
      </EuiText>

      {feedbackLoop && feedbackLoop.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" data-test-subj="threatIntelHuntFeedbackLoop">
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingsFeedbackLoop',
              {
                defaultMessage:
                  'Hunt feedback is re-ranking digests. Top boosted report: {title} (rank {rank} → corroborated {corroborated}).',
                values: {
                  title: feedbackLoop[0].title,
                  rank: feedbackLoop[0].rank_score.toFixed(2),
                  corroborated: feedbackLoop[0].corroborated_rank_score.toFixed(2),
                },
              }
            )}
          </EuiText>
        </>
      ) : null}

      <EuiHorizontalRule margin="m" />

      {isLoading ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.huntFindingsLoading', {
            defaultMessage: 'Loading hunt findings…',
          })}
        </EuiText>
      ) : findings.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="threatIntelHuntFindingsEmpty">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.huntFindingsEmpty', {
            defaultMessage:
              'No hunt findings yet. Continuous hunt runs every 4h, or hunt from Agent Builder.',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="m">
          {findings.map((finding) => {
            const isExpanded = expandedId === finding.id;
            const assetSummary = [
              ...finding.affected_assets.hosts.slice(0, 3),
              ...finding.affected_assets.users.slice(0, 3),
            ].join(', ');
            return (
              <EuiFlexItem key={finding.id}>
                <EuiPanel hasBorder paddingSize="s" color="subdued">
                  <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
                    <EuiFlexItem grow={false}>
                      <EuiBadge>{finding.technique_id}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{finding.severity}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        <FormattedRelative value={new Date(finding['@timestamp'])} />
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{finding.technique_name || finding.technique_id}</strong>
                        {' · '}
                        <EuiButtonEmpty
                          size="xs"
                          flush="both"
                          onClick={() => onHighlightReport(finding.report_id)}
                        >
                          {finding.report_title || finding.report_id}
                        </EuiButtonEmpty>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        isLoading={creatingRuleId === finding.id}
                        onClick={() => handleCreateRule(finding)}
                        data-test-subj={`threatIntelHuntFindingCreateRule-${finding.id}`}
                      >
                        {i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.huntFindingsCreateRule',
                          { defaultMessage: 'Create rule' }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        onClick={() => setExpandedId(isExpanded ? undefined : finding.id)}
                      >
                        {isExpanded
                          ? i18n.translate(
                              'xpack.securitySolution.threatIntelligence.app.huntFindingsHideEsql',
                              { defaultMessage: 'Hide ES|QL' }
                            )
                          : i18n.translate(
                              'xpack.securitySolution.threatIntelligence.app.huntFindingsShowEsql',
                              { defaultMessage: 'Show ES|QL' }
                            )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="xs" />
                  <EuiText size="s">{finding.hypothesis}</EuiText>
                  {finding.hypothesis_rationale ? (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued">
                        {finding.hypothesis_rationale}
                      </EuiText>
                    </>
                  ) : null}
                  {assetSummary ? (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.huntFindingsAssets',
                          {
                            defaultMessage: 'Affected assets: {assets}',
                            values: { assets: assetSummary },
                          }
                        )}
                      </EuiText>
                    </>
                  ) : null}
                  {isExpanded && finding.proposed_esql_rule ? (
                    <>
                      <EuiSpacer size="s" />
                      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            iconType="discoverApp"
                            onClick={() => handleOpenInDiscover(finding.proposed_esql_rule)}
                            data-test-subj={`threatIntelHuntFindingOpenDiscover-${finding.id}`}
                          >
                            {i18n.translate(
                              'xpack.securitySolution.threatIntelligence.app.huntFindingsOpenDiscover',
                              { defaultMessage: 'Open in Discover' }
                            )}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
                        {finding.proposed_esql_rule}
                      </EuiCodeBlock>
                    </>
                  ) : null}
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const HuntFindingsPanel = React.memo(HuntFindingsPanelComponent);
