/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useReducer } from 'react';
import { EuiPanel, EuiFlexGroup, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Chart, Partition, Settings, PartitionLayout } from '@elastic/charts';
import { euiThemeVars } from '@kbn/ui-theme';
import { useSiemReadinessApi } from '@kbn/siem-readiness';
import {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../../common/api/detection_engine';
import { useFetchCoverageOverviewQuery } from '../../../../../detection_engine/rule_management/api/hooks/use_fetch_coverage_overview_query';
import type { CoverageOverviewDashboardState } from '../../../../../detection_engine/rule_management_ui/pages/coverage_overview/coverage_overview_dashboard_reducer';
import { createCoverageOverviewDashboardReducer } from '../../../../../detection_engine/rule_management_ui/pages/coverage_overview/coverage_overview_dashboard_reducer';

const initialCoverageState: CoverageOverviewDashboardState = {
  filter: {
    activity: [CoverageOverviewRuleActivity.Enabled],
    source: [CoverageOverviewRuleSource.Prebuilt, CoverageOverviewRuleSource.Custom],
  },
  showExpandedCells: false,
  isLoading: false,
  data: undefined,
};

export const MitreAttackRuleCoveragePanel: React.FC = () => {
  const [state, dispatch] = useReducer(
    createCoverageOverviewDashboardReducer(),
    initialCoverageState
  );

  const { data, isLoading, refetch } = useFetchCoverageOverviewQuery(state.filter);
  const {
    getInstalledIntegrations,
    getDetectionRules,
    useDetectionRuleById,
    getReadinessCategories,
  } = useSiemReadinessApi();

  const threatFields = useMemo(() => {
    if (!getDetectionRules.data?.data) return [];

    const allThreatElements: any[] = [];

    getDetectionRules.data.data.forEach((rule: any) => {
      if (rule.threat && Array.isArray(rule.threat)) {
        // Add each element from the threat array to our flat array
        rule.threat.forEach((threatElement: any) => {
          allThreatElements.push({
            ...threatElement,
            rule_id: rule.rule_id || rule.id,
            rule_name: rule.name,
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

  const tacticNameCounts = useMemo(() => {
    const countMap = new Map<string, number>();

    staticTactics.forEach((tacticName) => {
      countMap.set(tacticName, 0);
    });

    threatFields.forEach((threatElement: any) => {
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
  const totalMitreRules = useMemo(() => {
    const uniqueRuleIds = new Set<string>();

    threatFields.forEach((threatElement: any) => {
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

  const treemapData = useMemo(() => {
    return staticTactics.map((tacticName, index) => {
      const tacticData = tacticNameCounts.find((t) => t.name === tacticName);
      const count = tacticData ? tacticData.count : 0;

      return {
        name: tacticName,
        value: 1,
        count,
        color: count > 0 ? euiThemeVars.euiColorVis1 : euiThemeVars.euiColorLightShade,
        id: `tactic-${index}`,
        row: Math.floor(index / 7),
        col: index % 7,
        isEmpty: false,
      };
    });
  }, [staticTactics, tacticNameCounts]);

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
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttackCount.summary',
            {
              defaultMessage:
                '{mitreRules} out of {totalRules} enabled rules are mapped to a MITRE ATT&CK tactic.',
              values: {
                mitreRules: <strong>{totalMitreRules}</strong>,
                totalRules: <strong>{getDetectionRules.data?.data.length || 0}</strong>,
              },
            }
          )}
        </EuiText>

        <div style={{ height: '300px', width: '100%', position: 'relative' }}>
          <Chart>
            <Settings
              showLegend={false}
              tooltip={{
                type: 'vertical',
                customTooltip: ({ values }) => <div style={{ padding: '8px' }}>HELLO</div>,
              }}
              theme={{
                partition: {
                  fontFamily: euiThemeVars.euiFontFamily,
                  outerSizeRatio: 1,
                  sectorLineStroke: euiThemeVars.euiColorLightestShade,
                  sectorLineWidth: 1,
                },
              }}
            />
            <Partition
              id="mitre-coverage-treemap"
              data={treemapData}
              layout={PartitionLayout.treemap}
              valueAccessor={(d) => d.value}
              valueFormatter={() => 'HELLO'}
              config={{
                partitionLayout: PartitionLayout.treemap,
              }}
              layers={[
                {
                  groupByRollup: (d) => d.name,
                  nodeLabel: (d) => '',
                  fillLabel: {
                    valueFormatter: () => '',
                    fontWeight: 'bold',
                    padding: { top: 0, left: 0, right: 0, bottom: 0 },
                  },
                  shape: {
                    fillColor: (d) => {
                      const item = treemapData.find((itemx) => itemx.name === d);
                      return item?.color || euiThemeVars.euiColorLightShade;
                    },
                  },
                },
              ]}
            />
          </Chart>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
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
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                <div style={{ textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>
                  {item.name}
                </div>
                <div
                  style={{
                    textAlign: 'left',
                    fontSize: '12px',
                  }}
                >
                  {`${item.count} rules`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.description',
            {
              defaultMessage: 'Coverage of enabled detection rules across MITRE ATT&CK tactics',
            }
          )}
        </EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
