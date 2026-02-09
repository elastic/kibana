/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiText,
  EuiLoadingSpinner,
  EuiHealth,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useSiemReadinessApi,
  useMitreAttackIndicesDocCounts,
  useIntegrationDisplayNames,
} from '@kbn/siem-readiness';
import { IntegrationSelectablePopover } from '../../../components/integrations_selectable_popover';

interface DetectionRule {
  rule_id?: string;
  id?: string;
  name?: string;
  enabled?: boolean;
  threat?: ThreatElement[];
  index?: string | string[];
  related_integrations?: Array<{
    package: string;
    version?: string;
    integration?: string;
  }>;
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

const MITRE_TACTICS_LIST = [
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
];

const MITRE_TACTIC_TRANSLATIONS: Record<string, string> = {
  'Initial Access': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.initialAccess',
    { defaultMessage: 'Initial Access' }
  ),
  'Defense Evasion': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.defenseEvasion',
    { defaultMessage: 'Defense Evasion' }
  ),
  'Privilege Escalation': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.privilegeEscalation',
    { defaultMessage: 'Privilege Escalation' }
  ),
  Persistence: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.persistence',
    { defaultMessage: 'Persistence' }
  ),
  'Lateral Movement': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.lateralMovement',
    { defaultMessage: 'Lateral Movement' }
  ),
  Execution: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.execution',
    { defaultMessage: 'Execution' }
  ),
  Discovery: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.discovery',
    { defaultMessage: 'Discovery' }
  ),
  Collection: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.collection',
    { defaultMessage: 'Collection' }
  ),
  Exfiltration: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.exfiltration',
    { defaultMessage: 'Exfiltration' }
  ),
  Impact: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.impact',
    { defaultMessage: 'Impact' }
  ),
  'Resource Development': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.resourceDevelopment',
    { defaultMessage: 'Resource Development' }
  ),
  'Credential Access': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.credentialAccess',
    { defaultMessage: 'Credential Access' }
  ),
  'Command and Control': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.commandAndControl',
    { defaultMessage: 'Command and Control' }
  ),
  Reconnaissance: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.mitreAttack.tactic.reconnaissance',
    { defaultMessage: 'Reconnaissance' }
  ),
};

export const MitreAttackRuleCoveragePanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [activeTacticPopover, setActiveTacticPopover] = useState<string | null>(null);

  const { getDetectionRules, getIntegrations } = useSiemReadinessApi();
  const integrationDisplayNames = useIntegrationDisplayNames();

  const enabledRules = useMemo(
    () => (getDetectionRules.data?.data || []).filter((rule: DetectionRule) => rule.enabled),
    [getDetectionRules.data]
  );

  const installedPackageNames = useMemo(
    () =>
      new Set(
        getIntegrations?.data?.items
          ?.filter((pkg) => pkg.status === 'installed')
          .map((pkg) => pkg.name) || []
      ),
    [getIntegrations?.data]
  );

  const activeRuleIndices = useMemo(() => {
    return Array.from(new Set(enabledRules.flatMap((rule: DetectionRule) => rule.index || [])));
  }, [enabledRules]);

  const { data: mitreAttackIndicesDocCounts } = useMitreAttackIndicesDocCounts(activeRuleIndices);

  // Calculate total unique MITRE-related rules
  const totalMitreRules = useMemo((): number => {
    // 1. Create a lowercase set for O(1) lookups
    const staticTacticSet = new Set(MITRE_TACTICS_LIST.map((t) => t.toLowerCase()));

    return enabledRules.filter((rule: DetectionRule) =>
      // 2. Return true if ANY threat tactic matches our set
      rule.threat?.some((threat) => {
        const name = threat.tactic?.name?.trim().toLowerCase();
        return name && staticTacticSet.has(name);
      })
    ).length;
  }, [enabledRules]);

  // 2. Map each MITRE tactic to its specific coverage status
  const tacticCoverageMap = useMemo(() => {
    return MITRE_TACTICS_LIST.map((tacticName, index) => {
      // Find rules associated with this specific tactic
      const rulesForTactic = enabledRules.filter((rule: DetectionRule) =>
        rule.threat?.some(
          (threat: ThreatElement) => threat.tactic?.name?.toLowerCase() === tacticName.toLowerCase()
        )
      );

      const missingIntegrations = new Set<string>();
      let rulesMissingDataCount = 0;

      rulesForTactic.forEach((rule: DetectionRule) => {
        // Track integrations required by this rule but not installed
        rule.related_integrations?.forEach(
          (integration: { package: string; version?: string; integration?: string }) => {
            if (integration.package && !installedPackageNames.has(integration.package)) {
              missingIntegrations.add(integration.package);
            }
          }
        );

        // Track if the rule's indices actually contain any documents
        const ruleHasData = [rule.index]
          .flat()
          .some((idx) =>
            mitreAttackIndicesDocCounts?.find(
              (count) => count.index === idx && count.exists && count.docCount > 0
            )
          );
        if (!ruleHasData) rulesMissingDataCount++;
      });

      // Semantic Color Logic
      const hasMissingDependencies = missingIntegrations.size > 0 || rulesMissingDataCount > 0;
      const hasActiveRules = rulesForTactic.length > 0;

      const statusColor = hasMissingDependencies
        ? euiTheme.colors.borderBaseDanger // Warning/Incomplete
        : hasActiveRules
        ? euiTheme.colors.borderBaseAccentSecondary // Healthy
        : euiTheme.colors.lightShade; // Inactive

      return {
        tacticId: `tactic-${index}`,
        tacticName,
        ruleCount: rulesForTactic.length,
        missingPackages: Array.from(missingIntegrations),
        rulesMissingDataCount,
        statusColor,
      };
    });
  }, [enabledRules, installedPackageNames, mitreAttackIndicesDocCounts, euiTheme]);

  if (!getDetectionRules.data) {
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
                'This diagram shows which MITRE ATT&CK tactics have enabled rules mapped to them and whether any of those rules are missing required integrations',
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

        {/* Tactical Grid Visualization */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: euiTheme.size.xxs,
            height: '300px',
          }}
        >
          {tacticCoverageMap.map((tactic) => (
            <EuiPopover
              key={tactic.tacticId}
              isOpen={activeTacticPopover === tactic.tacticId}
              closePopover={() => setActiveTacticPopover(null)}
              button={
                <div
                  onClick={() => setActiveTacticPopover(tactic.tacticId)}
                  // Keyboard accessibility: Opens the popover when user presses Enter or Space
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveTacticPopover(tactic.tacticId);
                    }
                  }}
                  // Makes this div focusable via keyboard navigation (Tab key)
                  tabIndex={0}
                  role="button"
                  style={{
                    backgroundColor: tactic.statusColor,
                    padding: euiTheme.size.s,
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <EuiText size="xs">
                    <strong>
                      {MITRE_TACTIC_TRANSLATIONS[tactic.tacticName] || tactic.tacticName}
                    </strong>
                  </EuiText>
                  <div style={{ fontSize: euiTheme.size.m }}>
                    {tactic.missingPackages.length > 0 && (
                      <div>
                        <strong> {tactic.missingPackages.length}</strong>
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.missingIntegrations',
                          {
                            defaultMessage: ' missing integrations',
                          }
                        )}
                      </div>
                    )}
                    <div>
                      {tactic.ruleCount === 0 ? (
                        <>
                          <strong>{tactic.ruleCount}</strong>
                          {i18n.translate(
                            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.noRule',
                            {
                              defaultMessage: ' rule',
                            }
                          )}
                        </>
                      ) : (
                        <>
                          <strong>
                            {tactic.rulesMissingDataCount}
                            {' / '}
                            {tactic.ruleCount}
                          </strong>
                          {i18n.translate(
                            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.rulesMissingData',
                            {
                              defaultMessage: ' rules missing data',
                            }
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              }
            >
              <IntegrationSelectablePopover
                options={tactic.missingPackages.map((pkg) => ({
                  label: integrationDisplayNames.data?.get(pkg) || pkg,
                  key: pkg,
                }))}
                showOnlySelectable
              />
            </EuiPopover>
          ))}
        </div>

        {/* Legend for clarity */}
        <EuiFlexGroup direction="column" gutterSize="xs">
          <StatusLegend
            color={euiTheme.colors.vis.euiColorVis1}
            label={i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.legend.healthy',
              {
                defaultMessage: 'Healthy: All rules have integrations & data',
              }
            )}
          />
          <StatusLegend
            color={euiTheme.colors.vis.euiColorVis7}
            label={i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.legend.warning',
              {
                defaultMessage: 'Warning: Missing integrations or rule data',
              }
            )}
          />
          <StatusLegend
            color={euiTheme.colors.lightShade}
            label={i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack.legend.noRules',
              {
                defaultMessage: 'No enabled rules for this tactic',
              }
            )}
          />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const StatusLegend = ({ color, label }: { color: string; label: string }) => (
  <EuiHealth color={color}>
    <EuiText size="xs">{label}</EuiText>
  </EuiHealth>
);
