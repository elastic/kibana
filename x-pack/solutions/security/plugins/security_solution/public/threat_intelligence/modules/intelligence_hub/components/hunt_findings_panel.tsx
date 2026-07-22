/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '../../../../common/lib/kibana';
import { navigateToCorrelateReport } from '../../../lib/navigate_to_correlation_reports';
import { deployEsqlRule } from '../lib/deploy_esql_rule';
import { markHuntFindingDeployed } from '../lib/mark_hunt_finding_deployed';
import { getEsqlDiscoverUrl } from '../lib/open_esql_in_discover';
import { HuntFindingFlyout } from './hunt_finding_flyout';

interface HuntFindingAffectedAssets {
  hosts: string[];
  users: string[];
}

export interface HuntFindingListItem {
  id: string;
  '@timestamp': string;
  report_id: string;
  report_title?: string;
  report_source?: string;
  report_category?: string;
  technique_id: string;
  technique_ids?: string[];
  technique_name?: string;
  hypothesis: string;
  hypothesis_rationale?: string;
  confidence: number;
  severity: string;
  risk_score: number;
  proposed_esql_rule: string;
  rule_name?: string;
  env_hits?: number;
  tier?: string | number;
  status?: 'new' | 'deployed' | string;
  deployed_rule_id?: string;
  deployed_at?: string;
  affected_assets: HuntFindingAffectedAssets & Record<string, string[] | undefined>;
}

export interface FeedbackLoopSummary {
  report_id: string;
  title: string;
  rank_score: number;
  corroborated_rank_score: number;
}

type ConfidenceLevel = 'high' | 'medium' | 'low';

const normalizeConfidence = (confidence: number): number => {
  if (confidence > 1) {
    return confidence / 100;
  }
  return confidence;
};

const getConfidenceLevel = (confidence: number): ConfidenceLevel => {
  const normalized = normalizeConfidence(confidence);
  if (normalized >= 0.75) {
    return 'high';
  }
  if (normalized >= 0.4) {
    return 'medium';
  }
  return 'low';
};

const getConfidenceLabel = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high':
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.huntFindingsConfidenceHigh',
        { defaultMessage: 'High' }
      );
    case 'medium':
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.huntFindingsConfidenceMedium',
        { defaultMessage: 'Medium' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.huntFindingsConfidenceLow',
        { defaultMessage: 'Low' }
      );
  }
};

const getFindingTitle = (finding: HuntFindingListItem): string => {
  const ruleName = finding.rule_name?.trim();
  if (ruleName && !ruleName.toLowerCase().startsWith('ti hunt:')) {
    return ruleName;
  }
  return finding.technique_name || finding.technique_id;
};

const getTechniqueIds = (finding: HuntFindingListItem): string[] => {
  if (finding.technique_ids && finding.technique_ids.length > 0) {
    return finding.technique_ids;
  }
  return finding.technique_id ? [finding.technique_id] : [];
};

const formatAffectedSummary = (
  assets: HuntFindingListItem['affected_assets']
): { summary: string; details: Array<{ label: string; values: string[] }> } => {
  const details: Array<{ label: string; values: string[] }> = [];
  const parts: string[] = [];

  const pushAsset = (key: string, labelSingular: string, labelPlural: string) => {
    const values = (assets[key] ?? []).filter(Boolean);
    if (values.length === 0) {
      return;
    }
    details.push({ label: labelPlural, values });
    parts.push(
      i18n.translate('xpack.securitySolution.threatIntelligence.app.huntFindingsAffectedPart', {
        defaultMessage: '{count} {label}',
        values: {
          count: values.length,
          label: values.length === 1 ? labelSingular : labelPlural,
        },
      })
    );
  };

  pushAsset('users', 'user', 'users');
  pushAsset('hosts', 'host', 'hosts');
  pushAsset('pods', 'pod', 'pods');
  pushAsset('namespaces', 'namespace', 'namespaces');
  pushAsset('orgs', 'org', 'orgs');
  pushAsset('repos', 'repo', 'repos');

  return {
    summary: parts.join(' · '),
    details,
  };
};

const dedupeKey = (finding: HuntFindingListItem): string =>
  `${finding.report_id}:${finding.technique_id}`;

const partitionFindings = (findings: HuntFindingListItem[]) => {
  const groups = new Map<string, HuntFindingListItem[]>();
  for (const finding of findings) {
    const key = dedupeKey(finding);
    const group = groups.get(key) ?? [];
    group.push(finding);
    groups.set(key, group);
  }

  const visible: HuntFindingListItem[] = [];
  const suppressed: HuntFindingListItem[] = [];
  for (const group of groups.values()) {
    visible.push(group[0]);
    suppressed.push(...group.slice(1));
  }

  return { visible, suppressed, suppressedCount: suppressed.length };
};

interface Props {
  findings: HuntFindingListItem[];
  feedbackLoop?: FeedbackLoopSummary[];
  isLoading: boolean;
  onHighlightReport: (reportId: string) => void;
  onCorrelateReport?: (reportId: string) => void;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
}

const stopRowClickPropagation = (event: React.MouseEvent | React.KeyboardEvent): void => {
  event.stopPropagation();
};

const HuntFindingsPanelComponent: React.FC<Props> = ({
  findings,
  isLoading,
  onCorrelateReport,
  http,
  notifications,
  application,
}) => {
  const { euiTheme } = useEuiTheme();
  const { share } = useKibana().services;
  const [creatingRuleId, setCreatingRuleId] = useState<string | undefined>();
  // Optimistic overlay until parent refetches findings with ES status / rule id.
  const [deployedRuleIdsByFinding, setDeployedRuleIdsByFinding] = useState<Map<string, string>>(
    () => new Map()
  );
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [openAffectedPopoverId, setOpenAffectedPopoverId] = useState<string | undefined>();
  const [selectedFinding, setSelectedFinding] = useState<HuntFindingListItem | undefined>();

  const { visible, suppressed, suppressedCount } = useMemo(
    () => partitionFindings(findings),
    [findings]
  );

  const tableItems = useMemo(
    () => (showSuppressed ? [...visible, ...suppressed] : visible),
    [showSuppressed, suppressed, visible]
  );

  const getDeployedRuleId = useCallback(
    (finding: HuntFindingListItem): string | undefined =>
      finding.deployed_rule_id || deployedRuleIdsByFinding.get(finding.id),
    [deployedRuleIdsByFinding]
  );

  const isFindingDeployed = useCallback(
    (finding: HuntFindingListItem): boolean =>
      finding.status === 'deployed' ||
      deployedRuleIdsByFinding.has(finding.id) ||
      Boolean(finding.deployed_rule_id),
    [deployedRuleIdsByFinding]
  );

  const openDeployedRule = useCallback(
    (ruleId: string) => {
      const rulePath = application.getUrlForApp('securitySolutionUI', {
        deepLinkId: 'rules',
        path: `/id/${ruleId}`,
      });
      window.open(rulePath, '_blank', 'noopener,noreferrer');
    },
    [application]
  );

  const envHitsBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseDanger,
    color: euiTheme.colors.danger,
  });

  const techniqueBadgeCss = css({
    backgroundColor: euiTheme.colors.lightShade,
    color: euiTheme.colors.textParagraph,
  });

  const statusNewBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseAccent ?? euiTheme.colors.backgroundBaseDanger,
    color: euiTheme.colors.accentText ?? euiTheme.colors.accent ?? euiTheme.colors.danger,
  });

  const statusDeployedBadgeCss = css({
    backgroundColor: euiTheme.colors.emptyShade,
    color: euiTheme.colors.success,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.success}`,
  });

  const confidenceHighBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseSuccess,
    color: euiTheme.colors.success,
  });

  const tableCss = css({
    '.euiTableHeaderCell': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '.euiTableRow:nth-child(even)': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '.euiTableRowCell': {
      verticalAlign: 'top',
      paddingTop: euiTheme.size.m,
      paddingBottom: euiTheme.size.m,
    },
  });

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
          tags: ['threat-intel', `mitre:${finding.technique_id}`, `hunt-finding:${finding.id}`],
        });

        try {
          await markHuntFindingDeployed(http, finding.id, result.ruleId);
          setDeployedRuleIdsByFinding((prev) => {
            const next = new Map(prev);
            next.set(finding.id, result.ruleId);
            return next;
          });
          setSelectedFinding((current) =>
            current?.id === finding.id
              ? {
                  ...current,
                  status: 'deployed',
                  deployed_rule_id: result.ruleId,
                }
              : current
          );
        } catch (persistErr) {
          // Rule exists; status may lag until retry/refetch. Still keep local link.
          setDeployedRuleIdsByFinding((prev) => {
            const next = new Map(prev);
            next.set(finding.id, result.ruleId);
            return next;
          });
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingsPersistDeployWarningTitle',
              { defaultMessage: 'Rule created, status not saved' }
            ),
            text: i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingsPersistDeployWarningBody',
              {
                defaultMessage:
                  'The detection rule was created, but updating hunt finding status failed: {message}',
                values: { message: (persistErr as Error).message },
              }
            ),
          });
        }

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
          toastLifeTimeMs: 8000,
        });
        openDeployedRule(result.ruleId);
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
    [http, notifications, openDeployedRule]
  );

  const handleCorrelateReport = useCallback(
    (reportId: string) => {
      if (onCorrelateReport) {
        onCorrelateReport(reportId);
        return;
      }
      void navigateToCorrelateReport(application, reportId);
    },
    [application, onCorrelateReport]
  );

  const handleInvestigateFinding = useCallback(
    (finding: HuntFindingListItem) => {
      if (!finding.proposed_esql_rule) {
        notifications.toasts.addDanger(
          i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsInvestigateMissingQuery',
            { defaultMessage: 'This finding has no ES|QL query to investigate.' }
          )
        );
        return;
      }
      const url = getEsqlDiscoverUrl(share, finding.proposed_esql_rule);
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

  const handleRowClick = useCallback((finding: HuntFindingListItem) => {
    setSelectedFinding(finding);
  }, []);

  const columns = useMemo((): Array<EuiBasicTableColumn<HuntFindingListItem>> => {
    return [
      {
        field: 'technique_id',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnFinding',
          { defaultMessage: 'Finding' }
        ),
        width: '22%',
        render: (_techniqueId: string, finding: HuntFindingListItem) => (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{getFindingTitle(finding)}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {getTechniqueIds(finding).map((techniqueId) => (
                  <EuiFlexItem key={`${finding.id}-${techniqueId}`} grow={false}>
                    <EuiBadge css={techniqueBadgeCss}>{techniqueId}</EuiBadge>
                  </EuiFlexItem>
                ))}
                {(finding.env_hits ?? 0) > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge css={envHitsBadgeCss}>
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.huntFindingsEnvHitsBadge',
                        {
                          defaultMessage: '{count} env hits',
                          values: { count: finding.env_hits },
                        }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                ) : null}
                {finding.tier != null && finding.tier !== '' ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.huntFindingsTierBadge',
                        {
                          defaultMessage: 'Tier {tier}',
                          values: { tier: finding.tier },
                        }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'report_id',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnSourceReport',
          { defaultMessage: 'Source report' }
        ),
        width: '20%',
        render: (_reportId: string, finding: HuntFindingListItem) => {
          const metaParts: React.ReactNode[] = [];
          if (finding.report_source) {
            metaParts.push(finding.report_source);
          }
          if (finding.report_category) {
            metaParts.push(finding.report_category);
          }
          metaParts.push(<FormattedRelative key="ts" value={new Date(finding['@timestamp'])} />);

          return (
            <EuiFlexGroup
              direction="column"
              gutterSize="xs"
              data-test-subj={`threatIntelHuntFindingSource-${finding.id}`}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">{finding.report_title || finding.report_id}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {metaParts.map((part, index) => (
                    <React.Fragment key={index}>
                      {index > 0 ? ' · ' : null}
                      {part}
                    </React.Fragment>
                  ))}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'hypothesis',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnHypothesis',
          { defaultMessage: 'Hypothesis' }
        ),
        width: '20%',
        render: (hypothesis: string) => (
          <EuiText
            size="s"
            title={hypothesis}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {hypothesis}
          </EuiText>
        ),
      },
      {
        field: 'confidence',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnConfidence',
          { defaultMessage: 'Confidence' }
        ),
        width: '9%',
        render: (confidence: number) => {
          const level = getConfidenceLevel(confidence);
          if (level === 'high') {
            return <EuiBadge css={confidenceHighBadgeCss}>{getConfidenceLabel(level)}</EuiBadge>;
          }
          return <EuiBadge color="hollow">{getConfidenceLabel(level)}</EuiBadge>;
        },
      },
      {
        field: 'affected_assets',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnAffected',
          { defaultMessage: 'Affected' }
        ),
        width: '12%',
        render: (assets: HuntFindingListItem['affected_assets'], finding: HuntFindingListItem) => {
          const { summary, details } = formatAffectedSummary(assets);
          if (!summary) {
            return i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingsAffectedNone',
              { defaultMessage: '—' }
            );
          }

          const isPopoverOpen = openAffectedPopoverId === finding.id;
          const button = (
            <EuiBadge
              color="hollow"
              onClick={(event) => {
                stopRowClickPropagation(event);
                setOpenAffectedPopoverId(isPopoverOpen ? undefined : finding.id);
              }}
              onClickAriaLabel={summary}
              data-test-subj={`threatIntelHuntFindingAffected-${finding.id}`}
            >
              {summary}
            </EuiBadge>
          );

          return (
            <EuiPopover
              button={button}
              isOpen={isPopoverOpen}
              closePopover={() => setOpenAffectedPopoverId(undefined)}
              anchorPosition="upCenter"
              panelPaddingSize="s"
            >
              <EuiText size="xs">
                {details.map((detail, index) => (
                  <React.Fragment key={detail.label}>
                    {index > 0 ? <EuiSpacer size="s" /> : null}
                    <strong>{detail.label}</strong>
                    <br />
                    {detail.values.join(', ')}
                  </React.Fragment>
                ))}
              </EuiText>
            </EuiPopover>
          );
        },
      },
      {
        field: 'status',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnStatus',
          { defaultMessage: 'Status' }
        ),
        width: '8%',
        render: (_status: HuntFindingListItem['status'], finding: HuntFindingListItem) => {
          const deployed = isFindingDeployed(finding);
          return deployed ? (
            <EuiBadge css={statusDeployedBadgeCss}>
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.huntFindingsStatusDeployed',
                { defaultMessage: 'Deployed' }
              )}
            </EuiBadge>
          ) : (
            <EuiBadge css={statusNewBadgeCss}>
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.huntFindingsStatusNew',
                { defaultMessage: 'New' }
              )}
            </EuiBadge>
          );
        },
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingsColumnActions',
          { defaultMessage: 'Actions' }
        ),
        width: '9%',
        render: (finding: HuntFindingListItem) => {
          const deployed = isFindingDeployed(finding);
          const deployedRuleId = getDeployedRuleId(finding);
          const deployLabel = i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsDeployRule',
            { defaultMessage: 'Deploy rule' }
          );
          const openRuleLabel = i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsOpenRule',
            { defaultMessage: 'Open detection rule' }
          );
          const correlateLabel = i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsCorrelateReport',
            { defaultMessage: 'Correlate report' }
          );
          const esqlLabel = i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsShowEsql',
            { defaultMessage: 'Show ES|QL' }
          );

          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
              <EuiFlexItem grow={false}>
                {deployed && deployedRuleId ? (
                  <EuiToolTip content={openRuleLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      size="s"
                      iconType="checkInCircleFilled"
                      color="primary"
                      onClick={(event: React.MouseEvent) => {
                        stopRowClickPropagation(event);
                        openDeployedRule(deployedRuleId);
                      }}
                      aria-label={openRuleLabel}
                      data-test-subj={`threatIntelHuntFindingOpenRule-${finding.id}`}
                    />
                  </EuiToolTip>
                ) : (
                  <EuiToolTip content={deployLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      size="s"
                      iconType="plusInCircle"
                      color="text"
                      isLoading={creatingRuleId === finding.id}
                      onClick={(event: React.MouseEvent) => {
                        stopRowClickPropagation(event);
                        void handleCreateRule(finding);
                      }}
                      aria-label={deployLabel}
                      data-test-subj={`threatIntelHuntFindingCreateRule-${finding.id}`}
                    />
                  </EuiToolTip>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={correlateLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="s"
                    iconType="inspect"
                    color="text"
                    onClick={(event: React.MouseEvent) => {
                      stopRowClickPropagation(event);
                      handleCorrelateReport(finding.report_id);
                    }}
                    aria-label={correlateLabel}
                    data-test-subj={`threatIntelHuntFindingCorrelate-${finding.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={esqlLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="s"
                    iconType="editorCodeBlock"
                    color="text"
                    onClick={(event: React.MouseEvent) => {
                      stopRowClickPropagation(event);
                      setSelectedFinding(finding);
                    }}
                    aria-label={esqlLabel}
                    data-test-subj={`threatIntelHuntFindingToggleEsql-${finding.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
  }, [
    confidenceHighBadgeCss,
    creatingRuleId,
    envHitsBadgeCss,
    getDeployedRuleId,
    handleCorrelateReport,
    handleCreateRule,
    isFindingDeployed,
    openAffectedPopoverId,
    openDeployedRule,
    statusDeployedBadgeCss,
    statusNewBadgeCss,
    techniqueBadgeCss,
  ]);

  const rowProps = useCallback(
    (finding: HuntFindingListItem) => ({
      onClick: () => handleRowClick(finding),
      style: { cursor: 'pointer' },
      'data-test-subj': `threatIntelHuntFindingRow-${finding.id}`,
    }),
    [handleRowClick]
  );

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      color="transparent"
      data-test-subj="threatIntelHuntFindingsPanel"
    >
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
            'Durable results from continuous and on-demand hunts. Continuous hunt runs every hour.',
        })}
      </EuiText>

      <EuiSpacer size="m" />

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
              'No hunt findings yet. Continuous hunt runs every hour, or hunt from Agent Builder.',
          })}
        </EuiText>
      ) : (
        <>
          <div css={tableCss}>
            <EuiInMemoryTable
              data-test-subj="threatIntelHuntFindingsTable"
              items={tableItems}
              columns={columns}
              itemId="id"
              rowProps={rowProps}
              tableLayout="auto"
            />
          </div>
          {suppressedCount > 0 ? (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="threatIntelHuntFindingsSuppressedFooter"
                  >
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.huntFindingsSuppressedFooter',
                      {
                        defaultMessage:
                          '{count, plural, one {# duplicate finding suppressed this cycle} other {# duplicate findings suppressed this cycle}}',
                        values: { count: suppressedCount },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={() => setShowSuppressed((current) => !current)}
                    data-test-subj="threatIntelHuntFindingsToggleSuppressed"
                  >
                    {showSuppressed
                      ? i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.huntFindingsHideSuppressed',
                          { defaultMessage: 'Hide suppressed' }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.huntFindingsShowSuppressed',
                          { defaultMessage: 'Show suppressed' }
                        )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
        </>
      )}
      {selectedFinding ? (
        <HuntFindingFlyout
          finding={selectedFinding}
          isDeployed={isFindingDeployed(selectedFinding)}
          isDeploying={creatingRuleId === selectedFinding.id}
          deployedRuleId={getDeployedRuleId(selectedFinding)}
          onClose={() => setSelectedFinding(undefined)}
          onDeployRule={handleCreateRule}
          onInvestigate={handleInvestigateFinding}
          onOpenRule={openDeployedRule}
        />
      ) : null}
    </EuiPanel>
  );
};

export const HuntFindingsPanel = React.memo(HuntFindingsPanelComponent);
export const HuntFindingsTable = HuntFindingsPanel;
