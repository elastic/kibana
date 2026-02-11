/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn, EuiSelectableOption } from '@elastic/eui';
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
import type { SiemReadinessPackageInfo } from '@kbn/siem-readiness';
import { useBasePath } from '../../../../../common/lib/kibana';
import { IntegrationSelectablePopover } from '../../../components/integrations_selectable_popover';

const getIntegrationUrl = (basePath: string, integration: string): string => {
  const baseUrl = `${basePath}/app/integrations/detail`;
  return integration ? `${baseUrl}/${integration}` : baseUrl;
};

export const AllRuleCoveragePanel: React.FC = () => {
  const basePath = useBasePath();
  const { euiTheme } = useEuiTheme();

  const { getIntegrations, getDetectionRules } = useSiemReadinessApi();

  const getInstalledIntegrations =
    getIntegrations?.data?.items?.filter(
      (pkg: SiemReadinessPackageInfo) => pkg.status === 'installed'
    ) || [];

  const integrationNames = getInstalledIntegrations?.map((item) => item.name) || [];

  const installedIntegrationRules = useDetectionRulesByIntegration(integrationNames);

  const integrationDisplayNames = useIntegrationDisplayNames();

  const getIntegrationDisplayName = useCallback(
    (packageName: string): string => {
      return integrationDisplayNames.data?.get(packageName) || packageName;
    },
    [integrationDisplayNames.data]
  );

  const installedIntegrationsOptions = useMemo(() => {
    return (installedIntegrationRules.ruleIntegrationCoverage?.installedIntegrations || []).map(
      (integration) => ({
        label: getIntegrationDisplayName(integration),
        key: integration,
      })
    );
  }, [
    getIntegrationDisplayName,
    installedIntegrationRules.ruleIntegrationCoverage?.installedIntegrations,
  ]);

  const missingIntegrationsOptions = useMemo(() => {
    return (installedIntegrationRules.ruleIntegrationCoverage?.missingIntegrations || []).map(
      (integration) => ({
        label: getIntegrationDisplayName(integration),
        key: integration,
      })
    );
  }, [
    getIntegrationDisplayName,
    installedIntegrationRules.ruleIntegrationCoverage?.missingIntegrations,
  ]);

  const onChangePopOver = (popoverOptions: EuiSelectableOption[]) => {
    // Find the selected option
    const selectedOption = popoverOptions.find((option) => option.checked === 'on');

    if (selectedOption) {
      const integrationUrl = getIntegrationUrl(basePath, selectedOption.key as string);
      window.open(integrationUrl, '_blank', 'noopener,noreferrer');
    }
  };

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
          status === 'Installed integrations'
            ? euiTheme.colors.vis.euiColorVis0
            : euiTheme.colors.vis.euiColorVis6;
        return <EuiHealth color={color}>{status}</EuiHealth>;
      },
      mobileOptions: {
        render: (item: { status: string; numberOfRulesAssociated: number; actions: string }) => {
          const color =
            item.status === 'Installed integrations'
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
        if (item.status === 'Installed integrations') {
          return (
            <IntegrationSelectablePopover
              options={installedIntegrationsOptions}
              onChange={onChangePopOver}
            />
          );
        } else {
          // For "Missing Integrations" row
          return (
            <IntegrationSelectablePopover
              options={missingIntegrationsOptions}
              onChange={onChangePopOver}
            />
          );
        }
      },
      mobileOptions: {
        show: false,
      },
    },
  ];

  const installedIntegrationAssociatedRulesCount =
    installedIntegrationRules.ruleIntegrationCoverage?.coveredRules?.length || 0;

  const missingIntegrationAssociatedRulesCount =
    (getDetectionRules.data?.data?.length || 0) - installedIntegrationAssociatedRulesCount;

  const RULE_STATS_DATA = useMemo(
    () => [
      {
        status: 'Installed integrations',
        numberOfRulesAssociated: installedIntegrationAssociatedRulesCount || 0,
        actions: '',
      },
      {
        status: 'Missing Integrations',
        numberOfRulesAssociated: missingIntegrationAssociatedRulesCount || 0,
        actions: '',
      },
    ],
    [installedIntegrationAssociatedRulesCount, missingIntegrationAssociatedRulesCount]
  );
  const isLoading = getIntegrations.isLoading || getDetectionRules.isLoading;
  const DONUT_CHART_DATA = useMemo(
    () => [
      {
        status: 'Rules with installed integrations',
        count: installedIntegrationAssociatedRulesCount || 0,
      },
      {
        status: 'Rules missing integrations',
        count:
          (getDetectionRules.data?.data?.length || 0) -
          (installedIntegrationAssociatedRulesCount || 0),
      },
    ],
    [getDetectionRules.data?.data?.length, installedIntegrationAssociatedRulesCount]
  );
  return (
    <>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.description',
            {
              defaultMessage:
                'The following table shows the total number of enabled rules, and those missing integrations.',
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
