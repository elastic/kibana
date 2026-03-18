/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiText,
  EuiBasicTable,
  EuiHealth,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Partition, Settings, PartitionLayout, LIGHT_THEME } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  useDetectionRulesByIntegration,
  useIntegrationDisplayNames,
  useSiemReadinessApi,
} from '@kbn/siem-readiness';
import { IntegrationSelectablePopover } from '../../../components/integrations_selectable_popover';
import {
  INTEGRATIONS_INSTALLED_TOOLTIP,
  INTEGRATIONS_UNINSTALLED_TOOLTIP,
  INTEGRATIONS_ENABLED_TOOLTIP,
  INTEGRATIONS_ENABLED,
  INTEGRATIONS_DISABLED,
  INTEGRATIONS_UNINSTALLED,
} from '../../../../../detection_engine/common/components/related_integrations/translations';

export const AllRuleCoveragePanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const { getDetectionRules } = useSiemReadinessApi();

  const allRules = useMemo(
    () => getDetectionRules.data?.data || [],
    [getDetectionRules.data?.data]
  );

  const { ruleIntegrationCoverage, enabledPackagesSet, disabledPackagesSet } =
    useDetectionRulesByIntegration();

  const integrationDisplayNames = useIntegrationDisplayNames();

  const getIntegrationDisplayName = useCallback(
    (packageName: string): string => {
      return integrationDisplayNames.data?.get(packageName) || packageName;
    },
    [integrationDisplayNames.data]
  );

  // Get enabled rules from all rules
  const enabledRules = useMemo(() => allRules.filter((rule) => rule.enabled), [allRules]);

  // Get unique integration names from enabled rules
  const relatedIntegrationNames = useMemo(() => {
    const uniqueNames = new Set<string>();

    enabledRules.forEach((rule) => {
      (rule.related_integrations || []).forEach((integration) => {
        if (integration.package) {
          uniqueNames.add(integration.package);
        }
      });
    });

    return [...uniqueNames];
  }, [enabledRules]);

  const enabledIntegrationsOptions = useMemo(() => {
    return relatedIntegrationNames
      .filter((name) => enabledPackagesSet.has(name))
      .map((name) => ({
        label: getIntegrationDisplayName(name),
        key: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [relatedIntegrationNames, enabledPackagesSet, getIntegrationDisplayName]);

  const enabledIntegrationsStatusMap = useMemo(() => {
    const map = new Map<string, { status: string; badgeColor: string; tooltip: string }>();
    const enabledIntegrations = relatedIntegrationNames.filter((name) =>
      enabledPackagesSet.has(name)
    );

    for (const name of enabledIntegrations) {
      map.set(name, {
        status: INTEGRATIONS_ENABLED,
        badgeColor: 'success',
        tooltip: INTEGRATIONS_ENABLED_TOOLTIP,
      });
    }

    return map;
  }, [relatedIntegrationNames, enabledPackagesSet]);

  const missingOrDisabledIntegrationsOptions = useMemo(() => {
    return relatedIntegrationNames
      .filter((name) => !enabledPackagesSet.has(name))
      .map((name) => ({
        label: getIntegrationDisplayName(name),
        key: name,
        isDisabled: disabledPackagesSet.has(name),
      }))
      .sort((a, b) => {
        if (a.isDisabled !== b.isDisabled) return a.isDisabled ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
  }, [relatedIntegrationNames, enabledPackagesSet, disabledPackagesSet, getIntegrationDisplayName]);

  const missingOrDisabledStatusMap = useMemo(() => {
    const map = new Map<string, { status: string; badgeColor: string; tooltip: string }>();
    const missingOrDisabledIntegrations = relatedIntegrationNames.filter(
      (name) => !enabledPackagesSet.has(name)
    );

    for (const name of missingOrDisabledIntegrations) {
      const isDisabled = disabledPackagesSet.has(name);
      map.set(name, {
        status: isDisabled ? INTEGRATIONS_DISABLED : INTEGRATIONS_UNINSTALLED,
        badgeColor: isDisabled ? 'primary' : 'default',
        tooltip: isDisabled ? INTEGRATIONS_INSTALLED_TOOLTIP : INTEGRATIONS_UNINSTALLED_TOOLTIP,
      });
    }

    return map;
  }, [relatedIntegrationNames, enabledPackagesSet, disabledPackagesSet]);

  const chartBaseTheme = useMemo(
    () => ({
      ...LIGHT_THEME,
      colors: {
        ...LIGHT_THEME.colors,
        vizColors: [
          euiTheme.colors.vis.euiColorVis1,
          euiTheme.colors.vis.euiColorVis2,
          euiTheme.colors.vis.euiColorVis3,
        ],
      },
    }),
    [euiTheme]
  );

  const themeOverrides: PartialTheme = {
    partition: {
      emptySizeRatio: 0.4, // This creates the donut hole
      linkLabel: {
        maxCount: 0, // Hide all link labels
        fontSize: 0,
        textColor: 'transparent',
      },
      minFontSize: 0, // Additional safety to hide any text
      maxFontSize: 0,
    },
  };

  const columns: Array<
    EuiBasicTableColumn<{ status: string; numberOfRulesAssociated: number; actions: string }>
  > = [
    {
      field: 'status',
      name: 'Data Source status',
      'data-test-subj': 'firstNameCell',
      render: (status: string) => {
        const color =
          status === 'Enabled integrations'
            ? euiTheme.colors.vis.euiColorVis0
            : euiTheme.colors.vis.euiColorVis6;
        return <EuiHealth color={color}>{status}</EuiHealth>;
      },
      mobileOptions: {
        render: (item: { status: string; numberOfRulesAssociated: number; actions: string }) => {
          const color =
            item.status === 'Enabled integrations'
              ? euiTheme.colors.vis.euiColorVis0
              : euiTheme.colors.vis.euiColorVis6;
          return <EuiHealth color={color}>{item.status}</EuiHealth>;
        },
        header: false,
        truncateText: false,
        enlarge: true,
        width: '100%',
      },
    },
    {
      field: 'numberOfRulesAssociated',
      name: '# of rules associated',
      truncateText: true,
      mobileOptions: {
        show: false,
      },
    },
    {
      field: 'actions',
      name: 'Actions',
      truncateText: true,
      render: (actions: string, item) => {
        if (item.status === 'Enabled integrations') {
          return (
            <IntegrationSelectablePopover
              options={enabledIntegrationsOptions}
              statusMap={enabledIntegrationsStatusMap}
            />
          );
        } else {
          return (
            <IntegrationSelectablePopover
              options={missingOrDisabledIntegrationsOptions}
              statusMap={missingOrDisabledStatusMap}
            />
          );
        }
      },
      mobileOptions: {
        show: false,
      },
    },
  ];

  const enabledIntegrationRulesCount = ruleIntegrationCoverage?.coveredRules?.length || 0;

  const missingOrDisabledIntegrationRulesCount =
    (getDetectionRules.data?.data?.length || 0) - enabledIntegrationRulesCount;

  const RULE_STATS_DATA = useMemo(
    () => [
      {
        status: 'Enabled integrations',
        numberOfRulesAssociated: enabledIntegrationRulesCount || 0,
        actions: '',
      },
      {
        status: 'Missing or Disabled Integrations',
        numberOfRulesAssociated: missingOrDisabledIntegrationRulesCount || 0,
        actions: '',
      },
    ],
    [enabledIntegrationRulesCount, missingOrDisabledIntegrationRulesCount]
  );

  const isLoading = getDetectionRules.isLoading;
  const DONUT_CHART_DATA = useMemo(
    () => [
      {
        status: 'Rules with enabled integrations',
        count: enabledIntegrationRulesCount || 0,
      },
      {
        status: 'Rules with missing or disabled integrations',
        count: (getDetectionRules.data?.data?.length || 0) - (enabledIntegrationRulesCount || 0),
      },
    ],
    [getDetectionRules.data?.data?.length, enabledIntegrationRulesCount]
  );
  return (
    <>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.description',
            {
              defaultMessage:
                'The following table shows the total number of enabled rules, and those with missing or disabled integrations.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          {isLoading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: 200 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <div style={{ position: 'relative' }}>
              <Chart size={{ height: 200 }}>
                <Settings
                  baseTheme={chartBaseTheme}
                  theme={themeOverrides}
                  showLegend={false}
                  legendPosition="right"
                />
                <Partition
                  id="pieByRuleStatus"
                  data={DONUT_CHART_DATA}
                  layout={PartitionLayout.sunburst}
                  valueAccessor={(d) => d.count}
                  layers={[
                    {
                      groupByRollup: (d: (typeof DONUT_CHART_DATA)[0]) => 'Rules',
                      shape: {
                        fillColor:
                          chartBaseTheme.partition?.sectorLineStroke || euiTheme.colors.lightShade,
                      },
                    },
                    {
                      groupByRollup: (d: (typeof DONUT_CHART_DATA)[0]) => d.status,
                      shape: {
                        fillColor: (key, sortIndex) => {
                          const colors = [
                            euiTheme.colors.vis.euiColorVis0,
                            euiTheme.colors.vis.euiColorVis6,
                          ];
                          return colors[sortIndex % colors.length];
                        },
                      },
                    },
                  ]}
                  clockwiseSectors={false}
                />
              </Chart>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <EuiText size="m">
                  <strong>{DONUT_CHART_DATA.reduce((total, item) => total + item.count, 0)}</strong>
                </EuiText>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.totalEnabledRules',
                    {
                      defaultMessage: 'Total enabled rules',
                    }
                  )}
                </EuiText>
              </div>
            </div>
          )}
        </EuiFlexItem>
        <EuiFlexItem
          grow={3}
          style={{
            paddingTop: euiTheme.size.l,
          }}
        >
          <EuiBasicTable
            tableCaption="Demo of EuiBasicTable"
            responsiveBreakpoint={false}
            items={RULE_STATS_DATA}
            rowHeader="firstName"
            columns={columns}
            loading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
