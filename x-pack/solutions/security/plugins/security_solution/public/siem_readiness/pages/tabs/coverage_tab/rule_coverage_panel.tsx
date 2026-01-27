/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiBadge,
  EuiTitle,
  EuiButtonGroup,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDetectionRulesByIntegration, useSiemReadinessApi } from '@kbn/siem-readiness';
import type { SiemReadinessPackageInfo } from '@kbn/siem-readiness';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';
import { AllRuleCoveragePanel } from './rule_coverage_panels/all_rules';
import { MitreAttackRuleCoveragePanel } from './rule_coverage_panels/mitre_attack_rules';

const ELASTIC_INTEGRATIONS_DOCS_URL =
  'https://www.elastic.co/guide/en/kibana/current/connect-to-elasticsearch.html';

const buildMissingIntegrationDescription = (
  missingIntegration: string[],
  getCategoryUrl: (category: string) => string
): string => {
  const integrationLinks = missingIntegration
    .map((row) => {
      const url = getCategoryUrl(row);
      return `- [${row}](${window.location.origin}${url})`;
    })
    .join('\n');

  return i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.missingIntegrationDescription',
    {
      defaultMessage:
        'The following rules are missing required integrations, limiting visibility and detection coverage:\n\n{integrationLinks}\n\nPlease review and install the necessary integrations to restore full visibility.',
      values: { integrationLinks },
    }
  );
};

export const RuleCoveragePanel: React.FC = () => {
  const basePath = useBasePath();
  const getIntegrationUrl = useCallback(
    (integration: string): string => {
      const baseUrl = `${basePath}/app/integrations/detail`;
      return integration ? `${baseUrl}/${integration}` : baseUrl;
    },
    [basePath]
  );

  const { openNewCaseFlyout } = useSiemReadinessCases();
  const { getIntegrations, getDetectionRules } = useSiemReadinessApi();

  const getInstalledIntegrations =
    getIntegrations?.data?.items?.filter(
      (pkg: SiemReadinessPackageInfo) => pkg.status === 'installed'
    ) || [];

  const integrationNames = getInstalledIntegrations?.map((item) => item.name) || [];
  const installedIntegrationRules = useDetectionRulesByIntegration(integrationNames);

  const caseDescription = useMemo(
    () =>
      buildMissingIntegrationDescription(
        installedIntegrationRules.ruleIntegrationCoverage?.missingIntegrations || [],
        getIntegrationUrl
      ),
    [installedIntegrationRules.ruleIntegrationCoverage?.missingIntegrations, getIntegrationUrl]
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

  const installedIntegrationAssociatedRulesCount =
    installedIntegrationRules.ruleIntegrationCoverage?.coveredRules.length || 0;

  const missingIntegrationAssociatedRulesCount =
    (getDetectionRules.data?.data?.length || 0) - installedIntegrationAssociatedRulesCount;

  const hasMissingIntegrations = Boolean(
    installedIntegrationRules.ruleIntegrationCoverage?.missingIntegrations?.length
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
                        'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.title',
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
                  'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.createCase',
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
                'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.warningTitle',
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
                  id="xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.warningDescription"
                  defaultMessage="{count} detection rules can't run because they don't have the required data sources. Create a case to initiate a task to install the missing integrations or click view missing integrations to install missing data. View our {docs} to learn more about installing integrations."
                  values={{
                    count: missingIntegrationAssociatedRulesCount,
                    docs: (
                      <EuiLink href={ELASTIC_INTEGRATIONS_DOCS_URL} target="_blank" external>
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.docsLink',
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
          <AllRuleCoveragePanel />
        ) : (
          <MitreAttackRuleCoveragePanel />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
