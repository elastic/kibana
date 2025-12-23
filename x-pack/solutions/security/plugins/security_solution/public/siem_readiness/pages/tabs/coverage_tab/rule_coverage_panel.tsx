/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiBadge,
  EuiTitle,
  EuiButtonGroup,
  useEuiTheme,
  EuiText,
  EuiCallOut,
  EuiLink,
  EuiBasicTable,
  EuiHealth,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Partition, Settings, PartitionLayout, LIGHT_THEME } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useDetectionRulesByIntegration, useSiemReadinessApi } from '@kbn/siem-readiness';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';

const ELASTIC_INTEGRATIONS_DOCS_URL =
  'https://www.elastic.co/guide/en/kibana/current/connect-to-elasticsearch.html';

// interface CategoryCoverageData {
//   category: string;
//   hasCoverage: boolean;
//   totalDocs: number;
// }

const buildMissingCategoriesDescription = (
  missingCategories: string[],
  getCategoryUrl: (category: string) => string
): string => {
  const integrationLinks = missingCategories
    .map((row) => {
      const url = getCategoryUrl(row);
      return `- [${row}](${window.location.origin}${url})`;
    })
    .join('\n');

  return i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.dataCoverage.missingDataCaseDescription',
    {
      defaultMessage:
        'The following rules are missing required integrations, limiting visibility and detection coverage:\n\n{integrationLinks}\n\nPlease review and install the necessary integrations to restore full visibility.',
      values: { integrationLinks },
    }
  );
};

// const CATEGORY_ORDER = ['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'] as const;

export const RuleCoveragePanel: React.FC = () => {
  const basePath = useBasePath();
  const getCategoryIntegrationUrl = useCallback(
    (integration: string): string => {
      const baseUrl = `${basePath}/app/integrations/detail`;
      return integration ? `${baseUrl}/${integration}` : baseUrl;
    },
    [basePath]
  );

  const { openNewCaseFlyout } = useSiemReadinessCases();
  const {
    // getReadinessCategories,
    getInstalledIntegrations,
    // getNotInstalledIntegrations,
    getDetectionRules,
  } = useSiemReadinessApi();

  const integrationNames = getInstalledIntegrations.data?.map((item) => item.name) || [];
  const installedIntegrationRules = useDetectionRulesByIntegration(integrationNames);

  // const coverageData = useMemo<CategoryCoverageData[]>(() => {
  //   if (!getReadinessCategories.data?.mainCategoriesMap) {
  //     return [];
  //   }

  //   const mainCategoriesMap = getReadinessCategories.data.mainCategoriesMap;

  //   return CATEGORY_ORDER.map((category) => {
  //     const categoryData = mainCategoriesMap.find((item) => item.category === category);
  //     const totalDocs = categoryData?.indices.reduce((sum, index) => sum + index.docs, 0) || 0;

  //     return {
  //       category,
  //       hasCoverage: totalDocs > 0,
  //       totalDocs,
  //     };
  //   });
  // }, [getReadinessCategories.data?.mainCategoriesMap]);

  // const missingCategories = useMemo(
  //   () => coverageData.filter((row) => !row.hasCoverage),
  //   [coverageData]
  // );

  // const hasMissingData = missingCategories.length > 0;

  const caseDescription = useMemo(
    () =>
      buildMissingCategoriesDescription(
        installedIntegrationRules.data?.analytics.missingIntegrations || [],
        getCategoryIntegrationUrl
      ),
    [installedIntegrationRules.data?.analytics.missingIntegrations, getCategoryIntegrationUrl]
  );

  const handleCreateCase = useCallback(() => {
    openNewCaseFlyout({
      title: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.caseTitle',
        {
          defaultMessage: 'Missing Rule Integrations',
        }
      ),
      description: caseDescription,
      tags: ['siem-readiness', 'data-rule-coverage'],
    });
  }, [openNewCaseFlyout, caseDescription]);

  const toggleButtons = [
    {
      id: `all-rules-id`,
      label: 'All enabled rules',
    },
    {
      id: `mitre-id`,
      label: 'MITRE ATT&CK enabled rules',
      isDisabled: true,
    },
  ];

  const [toggleIdSelected, setToggleIdSelected] = useState(`all-rules-id`);

  const onChange = (optionId: string) => {
    setToggleIdSelected(optionId);
  };

  const { euiTheme } = useEuiTheme();

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
        const color = status === 'Installed integrations' ? '#16C5C0' : '#F6726A';
        return <EuiHealth color={color}>{status}</EuiHealth>;
      },
      mobileOptions: {
        render: (item: { status: string; numberOfRulesAssociated: number; actions: string }) => {
          const color = item.status === 'Installed integrations' ? '#16C5C0' : '#F6726A';
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
      mobileOptions: {
        show: false,
      },
    },
  ];

  const installedIntegrationAssociatedRulesCount =
    installedIntegrationRules.data?.data?.length || 0;

  const missingIntegrationAssociatedRulesCount =
    (getDetectionRules.data?.data?.length || 0) - installedIntegrationAssociatedRulesCount;

  const hasMissingIntegrations = Boolean(
    installedIntegrationRules.data?.analytics?.missingIntegrations?.length
  );

  const RULE_STATS_DATA = useMemo(
    () => [
      {
        status: 'Installed integrations',
        numberOfRulesAssociated: installedIntegrationAssociatedRulesCount || 0,
        // actions: getInstalledIntegrations.data?.length || 0,
        actions: 'PLACEHOLDER',
      },
      {
        status: 'Missing Integrations',
        numberOfRulesAssociated: missingIntegrationAssociatedRulesCount || 0,
        // actions: getNotInstalledIntegrations.data?.length || 0,
        actions: 'PLACEHOLDER',
      },
    ],
    [installedIntegrationAssociatedRulesCount, missingIntegrationAssociatedRulesCount]
  );
  const isLoading =
    getInstalledIntegrations.isLoading ||
    getDetectionRules.isLoading ||
    installedIntegrationRules.isLoading;
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
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate(
                        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.title',
                        {
                          defaultMessage: 'Data rule coverage',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                {hasMissingIntegrations && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning" iconType="warning" />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide="right"
                size="s"
                iconType="plusInCircle"
                onClick={handleCreateCase}
                data-test-subj="createNewCaseButton"
              >
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.coverage.dataCoverage.createCase',
                  {
                    defaultMessage: 'Create new case',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {hasMissingIntegrations && (
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.securitySolution.siemReadiness.coverage.dataCoverage.warningTitle',
                {
                  defaultMessage: 'Some detection rules are missing required integrations.',
                }
              )}
              color="warning"
              iconType="warning"
              size="s"
            >
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.siemReadiness.coverage.dataCoverage.warningDescription"
                  defaultMessage="{count} detection rules can't run because they don't have the required data sources. Create a case to initiate a task to install the missing integrations or click view missing integrations to install missing data. View our {docs} to learn more about installing integrations."
                  values={{
                    count: missingIntegrationAssociatedRulesCount,
                    docs: (
                      <EuiLink href={ELASTIC_INTEGRATIONS_DOCS_URL} target="_blank" external>
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.coverage.dataCoverage.docsLink',
                          {
                            defaultMessage: 'docs',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiButtonGroup
            legend="Default single select button group"
            options={toggleButtons}
            idSelected={toggleIdSelected}
            onChange={(id) => onChange(id)}
          />
        </EuiFlexItem>
        {toggleIdSelected === 'all-rules-id' ? (
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
            <EuiFlexGroup>
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
                                chartBaseTheme.partition?.sectorLineStroke ||
                                euiTheme.colors.lightShade,
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
                        <strong>
                          {DONUT_CHART_DATA.reduce((total, item) => total + item.count, 0)}
                        </strong>
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
              <EuiFlexItem>
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
        ) : (
          'Coming Soon'
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
