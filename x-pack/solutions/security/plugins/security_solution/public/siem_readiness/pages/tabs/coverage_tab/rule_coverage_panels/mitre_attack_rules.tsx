/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiText,
  EuiLoadingSpinner,
  EuiHealth,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSiemReadinessApi, useIndicesDocCounts } from '@kbn/siem-readiness';
import type { SiemReadinessPackageInfo, RelatedIntegrationRuleResponse } from '@kbn/siem-readiness';
interface DetectionRule extends RelatedIntegrationRuleResponse {
  rule_id?: string;
  id?: string;
  name?: string;
  enabled?: boolean;
  threat?: ThreatElement[];
  index?: string | string[];
}

interface ThreatElement {
  framework?: string;
  tactic?: {
    id?: string;
    name: string;
    reference?: string;
  };
  technique?: Array<{
    id?: string;
    name?: string;
    reference?: string;
    subtechnique?: Array<{
      id?: string;
      name?: string;
      reference?: string;
    }>;
  }>;
  rule_id: string;
  rule_name: string;
}

interface TacticNameCount {
  name: string;
  count: number;
}

interface MissingIntegrationsData {
  missingIntegrations: string[];
  ruleIds: Array<{ id: string; indices: string[]; hasDocuments: boolean }>;
}

interface TreemapDataItem {
  name: string;
  value: number;
  count: number;
  missingIntegrations: string[];
  missingIntegrationCount: number;
  rulesWithMissingIntegrations: number;
  rulesWithoutDocuments: number;
  color: string;
  id: string;
  row: number;
  col: number;
  isEmpty: boolean;
}

export const MitreAttackRuleCoveragePanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { getDetectionRules, getIntegrations } = useSiemReadinessApi();

  const getInstalledIntegrationsData = useMemo(() => {
    return (
      getIntegrations?.data?.items?.filter(
        (pkg: SiemReadinessPackageInfo) => pkg.status === 'installed'
      ) || []
    );
  }, [getIntegrations?.data?.items]);

  const installedIntegrationNames = useMemo(() => {
    return getInstalledIntegrationsData?.map((item) => item.name) || [];
  }, [getInstalledIntegrationsData]);

  // Collect all unique indices from all enabled rules
  const allRuleIndices = useMemo(() => {
    if (!getDetectionRules.data?.data) return [];

    const indices = new Set<string>();
    getDetectionRules.data.data.forEach((rule: DetectionRule) => {
      if (rule.enabled && rule.index) {
        const ruleIndexArray = Array.isArray(rule.index) ? rule.index : [rule.index];
        ruleIndexArray.forEach((index) => indices.add(index));
      }
    });

    return Array.from(indices);
  }, [getDetectionRules.data]);

  // Get document counts for all indices
  const { data: docCounts } = useIndicesDocCounts(allRuleIndices);

  const threatFields = useMemo((): ThreatElement[] => {
    if (!getDetectionRules.data?.data) return [];

    const allThreatElements: ThreatElement[] = [];

    getDetectionRules.data.data.forEach((rule: DetectionRule) => {
      // Only include enabled rules
      if (rule.enabled && rule.threat && Array.isArray(rule.threat)) {
        rule.threat.forEach((threatElement) => {
          allThreatElements.push({
            ...threatElement,
            rule_id: rule.rule_id || rule.id || '',
            rule_name: rule.name || '',
          });
        });
      }
    });

    return allThreatElements;
  }, [getDetectionRules.data]);

  const staticTactics = useMemo(
    () => [
      'Initial Access',
      'Defense Evasion',
      'Privilege Escalation',
      'Persistence',
      'Lateral Movement',
      'Execution',
      'Discovery',
      'Collection',
      'Exfiltration',
      'Impact',
      'Resource Development',
      'Credential Access',
      'Command and Control',
      'Reconnaissance',
    ],
    []
  );

  const tacticNameCounts = useMemo((): TacticNameCount[] => {
    const countMap = new Map<string, number>();

    staticTactics.forEach((tacticName) => {
      countMap.set(tacticName, 0);
    });

    threatFields.forEach((threatElement) => {
      if (threatElement.tactic && threatElement.tactic.name) {
        const tacticName = threatElement.tactic.name.trim();

        const matchingStaticTactic = staticTactics.find(
          (staticTactic) => staticTactic.toLowerCase() === tacticName.toLowerCase()
        );

        if (matchingStaticTactic) {
          countMap.set(matchingStaticTactic, (countMap.get(matchingStaticTactic) || 0) + 1);
        }
      }
    });

    return staticTactics.map((name) => ({
      name,
      count: countMap.get(name) || 0,
    }));
  }, [threatFields, staticTactics]);

  // Count total MITRE-related rules
  const totalMitreRules = useMemo((): number => {
    const uniqueRuleIds = new Set<string>();

    threatFields.forEach((threatElement) => {
      if (threatElement.tactic && threatElement.tactic.name && threatElement.rule_id) {
        const tacticName = threatElement.tactic.name.trim();

        // Check if this tactic matches any of our static tactics
        const matchingStaticTactic = staticTactics.find(
          (staticTactic) => staticTactic.toLowerCase() === tacticName.toLowerCase()
        );

        if (matchingStaticTactic) {
          uniqueRuleIds.add(threatElement.rule_id);
        }
      }
    });

    return uniqueRuleIds.size;
  }, [threatFields, staticTactics]);

  // Calculate missing integrations by MITRE tactic using rule data
  const missingIntegrationsByTactic = useMemo((): Map<string, MissingIntegrationsData> => {
    const tacticMap = new Map<
      string,
      { missingIntegrations: Set<string>; ruleMap: Map<string, Set<string>> }
    >();

    staticTactics.forEach((tacticName) => {
      tacticMap.set(tacticName, {
        missingIntegrations: new Set<string>(),
        ruleMap: new Map<string, Set<string>>(),
      });
    });

    // Process each rule to find missing integrations per tactic
    getDetectionRules.data?.data?.forEach((rule: DetectionRule) => {
      if (!rule.enabled) return;

      const ruleId = rule.rule_id || rule.id || '';
      const relatedIntegrations = rule.related_integrations || [];
      const ruleThreat = rule.threat || [];
      const ruleIndexArray = Array.isArray(rule.index)
        ? rule.index
        : rule.index
        ? [rule.index]
        : [];

      // Get missing integrations for this rule
      const missingIntegrations = relatedIntegrations
        .filter((integration) => {
          const packageName = integration.package;
          return packageName && !installedIntegrationNames.includes(packageName);
        })
        .map((integration) => integration.package)
        .filter((name): name is string => typeof name === 'string');

      // Map rule data to its MITRE tactics
      ruleThreat.forEach((threatElement) => {
        if (threatElement.tactic && threatElement.tactic.name) {
          const tacticName = threatElement.tactic.name.trim();

          // Find matching static tactic
          const matchingStaticTactic = staticTactics.find(
            (staticTactic) => staticTactic.toLowerCase() === tacticName.toLowerCase()
          );

          if (matchingStaticTactic) {
            const tacticData = tacticMap.get(matchingStaticTactic);
            if (tacticData) {
              // Add missing integrations if any
              if (missingIntegrations.length > 0) {
                missingIntegrations.forEach((integration) => {
                  tacticData.missingIntegrations.add(integration);
                });
              }

              // Add rule with its indices to tactic
              if (!tacticData.ruleMap.has(ruleId)) {
                tacticData.ruleMap.set(ruleId, new Set<string>());
              }
              const ruleIndicesSet = tacticData.ruleMap.get(ruleId);
              if (ruleIndicesSet) {
                ruleIndexArray.forEach((index) => {
                  ruleIndicesSet.add(index);
                });
              }
            }
          }
        }
      });
    });

    const result = new Map<string, MissingIntegrationsData>();
    tacticMap.forEach((value, key) => {
      const ruleIds = Array.from(value.ruleMap.entries()).map(([id, indicesSet]) => {
        const ruleIndices = Array.from(indicesSet);

        // Check if any of the rule's indices have documents
        const hasDocuments = ruleIndices.some((index) => {
          const docCount = docCounts?.find((dc) => dc.index === index);
          return docCount && docCount.exists && docCount.docCount > 0;
        });

        return {
          id,
          indices: ruleIndices,
          hasDocuments,
        };
      });

      result.set(key, {
        missingIntegrations: Array.from(value.missingIntegrations),
        ruleIds,
      });
    });

    return result;
  }, [staticTactics, getDetectionRules.data, installedIntegrationNames, docCounts]);
  // console.log(missingIntegrationsByTactic);
  const treemapData = useMemo((): TreemapDataItem[] => {
    return staticTactics.map((tacticName, index) => {
      const tacticData = tacticNameCounts.find((t) => t.name === tacticName);
      const count = tacticData ? tacticData.count : 0;
      const missingData = missingIntegrationsByTactic.get(tacticName) || {
        missingIntegrations: [],
        ruleIds: [],
      };

      // Count rules without documents
      const rulesWithoutDocuments = missingData.ruleIds.filter((rule) => !rule.hasDocuments).length;

      let color;
      if (missingData.missingIntegrations.length > 0 || rulesWithoutDocuments > 0) {
        color = euiTheme.colors.vis.euiColorVis7;
      } else if (count > 0) {
        color = euiTheme.colors.vis.euiColorVis1;
      } else {
        color = euiTheme.colors.lightShade;
      }

      return {
        name: tacticName,
        value: 1,
        count,
        missingIntegrations: missingData.missingIntegrations,
        missingIntegrationCount: missingData.missingIntegrations.length,
        rulesWithMissingIntegrations: missingData.ruleIds.length,
        rulesWithoutDocuments,
        color,
        id: `tactic-${index}`,
        row: Math.floor(index / 7),
        col: index % 7,
        isEmpty: false,
      };
    });
  }, [
    staticTactics,
    tacticNameCounts,
    missingIntegrationsByTactic,
    euiTheme.colors.vis.euiColorVis7,
    euiTheme.colors.vis.euiColorVis1,
    euiTheme.colors.lightShade,
  ]);

  const isLoading = !getDetectionRules.data || !getIntegrations?.data;

  if (isLoading) {
    return (
      <EuiPanel hasBorder>
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText size="s">
          <h4>
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.title',
              {
                defaultMessage: 'MITRE ATT&CK Tactics Coverage',
              }
            )}
          </h4>
        </EuiText>
        <EuiText size="s">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.summary',
            {
              defaultMessage:
                'This diagram shows what MITRE ATT&CK tactics have enabled rules mapped to them and if any of those rules are missing required integrations',
            }
          )}
        </EuiText>
        <EuiText size="s">
          <>
            <strong>{totalMitreRules}</strong>{' '}
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttackCount.summary.middle',
              {
                defaultMessage: 'out of',
              }
            )}{' '}
            <strong>{getDetectionRules.data?.data.length || 0}</strong>{' '}
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttackCount.summary.end',
              {
                defaultMessage: 'enabled rules are mapped to a MITRE ATT&CK tactic.',
              }
            )}
          </>
        </EuiText>

        <div style={{ height: '300px', width: '100%', position: 'relative' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: '1px',
              padding: '1px',
            }}
          >
            {treemapData.map((item, index) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: item.color,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: euiTheme.size.s,
                  fontSize: euiTheme.size.m,
                  fontWeight: 'bold',
                }}
              >
                <div style={{ textAlign: 'left', fontSize: euiTheme.size.m, fontWeight: 'bold' }}>
                  {item.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xxs }}>
                  {item.missingIntegrationCount > 0 && (
                    <div
                      style={{
                        textAlign: 'left',
                        fontSize: euiTheme.size.m,
                      }}
                    >
                      <span style={{ fontWeight: 'bold' }}>{item.missingIntegrationCount}</span>{' '}
                      <span style={{ fontWeight: 'normal' }}>
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.missingIntegrations',
                          {
                            defaultMessage: 'missing integrations',
                          }
                        )}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      textAlign: 'left',
                      fontSize: euiTheme.size.m,
                      fontWeight: 'normal',
                    }}
                  >
                    {item.count > 0 ? (
                      <>
                        <span style={{ fontWeight: 'bold' }}>{item.rulesWithoutDocuments}</span>
                        {`/`}
                        <span style={{ fontWeight: 'bold' }}>{item.count}</span>{' '}
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.rulesMissingData',
                          {
                            defaultMessage: 'rules missing data',
                          }
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 'bold' }}>{item.count}</span>{' '}
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.rules',
                          {
                            defaultMessage: 'rules',
                          }
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiHealth color={euiTheme.colors.vis.euiColorVis1}>
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.legend.hasAllRequiredIntegrations',
                  {
                    defaultMessage: 'All enabled rules have required integrations',
                  }
                )}
              </EuiText>
            </EuiHealth>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiHealth color={euiTheme.colors.vis.euiColorVis7}>
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.legend.missingIntegrations',
                  {
                    defaultMessage: 'At least one enabled rule is missing a required integration',
                  }
                )}
              </EuiText>
            </EuiHealth>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiHealth color={euiTheme.colors.lightShade}>
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.legend.noEnabledRules',
                  {
                    defaultMessage: 'No enabled rules',
                  }
                )}
              </EuiText>
            </EuiHealth>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
