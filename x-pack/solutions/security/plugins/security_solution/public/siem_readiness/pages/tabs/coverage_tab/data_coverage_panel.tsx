/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiBasicTable,
  EuiBadge,
  EuiLink,
  EuiCallOut,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSiemReadinessApi } from '@kbn/siem-readiness';
import type { SiemReadinessPackageInfo } from '@kbn/siem-readiness';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';
import { IntegrationSelectablePopover } from '../../components/integrations_selectable_popover';
import { ViewCasesButton } from '../../components/view_cases_button';

const CATEGORY_ORDER = ['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'] as const;

const CATEGORY_TO_INTEGRATION_FILTER: Record<string, string[]> = {
  Cloud: ['cloudsecurity_cdr', 'cloud'],
  Endpoint: ['edr_xdr'],
  Identity: ['iam'],
  Network: ['network_security', 'network'],
  'Application/SaaS': ['siem'],
};

const ELASTIC_INTEGRATIONS_DOCS_URL =
  'https://www.elastic.co/guide/en/kibana/current/connect-to-elasticsearch.html';

const DATA_COVERAGE_CREATE_CASE_TAGS = ['siem-readiness', 'data-coverage'];

interface CategoryCoverageData {
  category: string;
  hasCoverage: boolean;
  totalDocs: number;
}

const buildMissingCategoriesDescription = (
  missingCategories: CategoryCoverageData[],
  getCategoryUrl: (category: string) => string
): string => {
  const categoryLinks = missingCategories
    .map((row) => {
      const url = getCategoryUrl(row.category);
      return `- [${row.category}](${window.location.origin}${url})`;
    })
    .join('\n');

  return i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.dataCoverage.missingDataCaseDescription',
    {
      defaultMessage:
        'The following log categories are missing required integrations, limiting visibility and detection coverage:\n\n{categoryLinks}\n\nPlease review and install the necessary integrations to restore full visibility.',
      values: { categoryLinks },
    }
  );
};

// Component
export const DataCoveragePanel: React.FC = () => {
  const basePath = useBasePath();
  const { getReadinessCategories, getIntegrations } = useSiemReadinessApi();
  const { openNewCaseFlyout } = useSiemReadinessCases();

  const getCategoryIntegrationUrl = useCallback(
    (category: string): string => {
      const baseUrl = `${basePath}/app/integrations/browse/security`;
      const filter = CATEGORY_TO_INTEGRATION_FILTER[category];
      return filter ? `${baseUrl}/${filter[0]}` : baseUrl;
    },
    [basePath]
  );

  // Get integration options for a specific category
  const getIntegrationOptionsForCategory = useCallback(
    (category: string) => {
      const filterValues = CATEGORY_TO_INTEGRATION_FILTER[category];
      if (!filterValues || !getIntegrations.data?.items) {
        return [];
      }

      const filteredPackages = getIntegrations.data.items.filter(
        (pkg: SiemReadinessPackageInfo) => {
          return pkg.categories?.some((cat: string) => filterValues.includes(cat));
        }
      );

      return filteredPackages.map((pkg: SiemReadinessPackageInfo) => ({
        label: pkg.title || pkg.name,
        key: pkg.name,
        checked: undefined,
      }));
    },
    [getIntegrations.data?.items]
  );

  // Transform raw data into table rows
  const coverageData = useMemo<CategoryCoverageData[]>(() => {
    if (!getReadinessCategories.data?.mainCategoriesMap) {
      return [];
    }

    const mainCategoriesMap = getReadinessCategories.data.mainCategoriesMap;

    return CATEGORY_ORDER.map((category) => {
      const categoryData = mainCategoriesMap.find((item) => item.category === category);
      const totalDocs = categoryData?.indices.reduce((sum, index) => sum + index.docs, 0) || 0;

      return {
        category,
        hasCoverage: totalDocs > 0,
        totalDocs,
      };
    });
  }, [getReadinessCategories.data?.mainCategoriesMap]);

  const missingCategories = useMemo(
    () => coverageData.filter((row) => !row.hasCoverage),
    [coverageData]
  );

  const hasMissingData = missingCategories.length > 0;
  const missingCategoriesCount = missingCategories.length;

  const caseDescription = useMemo(
    () => buildMissingCategoriesDescription(missingCategories, getCategoryIntegrationUrl),
    [missingCategories, getCategoryIntegrationUrl]
  );

  const handleCreateCase = useCallback(() => {
    openNewCaseFlyout({
      title: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.caseTitle',
        {
          defaultMessage: 'Missing Log Category Integrations',
        }
      ),
      description: caseDescription,
      tags: DATA_COVERAGE_CREATE_CASE_TAGS,
    });
  }, [openNewCaseFlyout, caseDescription]);

  const columns: Array<EuiBasicTableColumn<CategoryCoverageData>> = [
    {
      field: 'category',
      name: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.table.categoryColumn',
        {
          defaultMessage: 'Log Category',
        }
      ),
    },
    {
      field: 'hasCoverage',
      name: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.table.statusColumn',
        {
          defaultMessage: 'Coverage status',
        }
      ),
      width: '150px',
      render: (hasCoverage: boolean) => {
        if (hasCoverage) {
          return (
            <EuiBadge color="success">
              {i18n.translate(
                'xpack.securitySolution.siemReadiness.coverage.dataCoverage.table.hasData',
                {
                  defaultMessage: 'Has data',
                }
              )}
            </EuiBadge>
          );
        }
        return (
          <EuiBadge color="warning">
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataCoverage.table.missingData',
              {
                defaultMessage: 'Missing data',
              }
            )}
          </EuiBadge>
        );
      },
    },
    {
      name: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.table.actionColumn',
        {
          defaultMessage: 'Action',
        }
      ),
      width: '220px',
      render: (row: CategoryCoverageData) => {
        const options = getIntegrationOptionsForCategory(row.category);

        return <IntegrationSelectablePopover options={options} />;
      },
    },
  ];

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        {/* Header Section */}
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
                          defaultMessage: 'Data coverage',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                {hasMissingData && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning" iconType="warning" />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              justifyContent="flexEnd"
            >
              <EuiFlexItem grow={false}>
                <ViewCasesButton caseTagsArray={DATA_COVERAGE_CREATE_CASE_TAGS} />
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
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Warning Callout */}
        {hasMissingData && (
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.securitySolution.siemReadiness.coverage.dataCoverage.warningTitle',
                {
                  defaultMessage: 'Some log categories are missing required integrations.',
                }
              )}
              color="warning"
              iconType="warning"
              size="s"
            >
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.siemReadiness.coverage.dataCoverage.warningDescription"
                  defaultMessage="Some log categories are missing integrations, limiting your visibility and detection coverage. Create a case to install the missing integrations for {count, plural, one {# category} other {# categories}} or view missing integrations to restore full visibility. Learn more about installing integrations in our {docs}."
                  values={{
                    count: missingCategoriesCount,
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

        {/* Description */}
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataCoverage.description',
              {
                defaultMessage:
                  'View the coverage status for each log category below to ensure you have incoming data.',
              }
            )}
          </EuiText>
        </EuiFlexItem>

        {/* Coverage Table */}
        <EuiFlexItem>
          <EuiBasicTable
            items={coverageData}
            columns={columns}
            data-test-subj="dataCoverageTable"
            tableCaption={i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.dataCoverage.table.caption',
              {
                defaultMessage: 'Data coverage by log category',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
