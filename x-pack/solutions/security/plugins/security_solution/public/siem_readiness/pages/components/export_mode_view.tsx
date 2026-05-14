/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MainCategories } from '@kbn/siem-readiness';
import { AllRuleCoveragePanel } from '../tabs/coverage_tab/rule_coverage_panels/all_rules';
import { MitreAttackRuleCoveragePanel } from '../tabs/coverage_tab/rule_coverage_panels/mitre_attack_rules';
import { DataCoveragePanel } from '../tabs/coverage_tab/data_coverage_panel';
import { QualityTab } from '../tabs/quality/quality_tab';
import { ContinuityTab } from '../tabs/continuity/continuity_tab';
import { RetentionTab } from '../tabs/retention/retention_tab';
import { ExportCaseDescription } from './export_case_description';
import { useExportCaseDescriptions } from '../../hooks/use_export_case_descriptions';

interface ExportModeViewProps {
  activeCategories: MainCategories[];
}

export const ExportModeView: React.FC<ExportModeViewProps> = ({ activeCategories }) => {
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const {
    coverageDescription,
    hasCoverageIssues,
    dataCoverageDescription,
    hasDataCoverageIssues,
    qualityDescription,
    hasQualityIssues,
    continuityDescription,
    hasContinuityIssues,
    retentionDescription,
    hasRetentionIssues,
  } = useExportCaseDescriptions(activeCategories);

  return (
    <div data-test-subj="exportModeView">
      {/* Report Header */}
      <EuiTitle size="l">
        <h1>
          {i18n.translate('xpack.securitySolution.siemReadiness.exportMode.title', {
            defaultMessage: 'SIEM Readiness Report',
          })}
        </h1>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.securitySolution.siemReadiness.exportMode.generatedAt', {
          defaultMessage: 'Generated: {date}',
          values: { date: generatedDate },
        })}
      </EuiText>
      <EuiHorizontalRule />

      {/* Coverage Section */}
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.securitySolution.siemReadiness.exportMode.coverage.title', {
            defaultMessage: 'Coverage',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <AllRuleCoveragePanel />
      <EuiSpacer size="m" />
      <MitreAttackRuleCoveragePanel />
      <EuiSpacer size="m" />
      <DataCoveragePanel />
      <EuiSpacer size="m" />
      <ExportCaseDescription
        title={i18n.translate(
          'xpack.securitySolution.siemReadiness.exportMode.coverage.ruleSummary.title',
          { defaultMessage: 'Rule Coverage Summary & Recommended Actions' }
        )}
        description={coverageDescription}
        hasIssues={hasCoverageIssues}
      />
      <EuiSpacer size="m" />
      <ExportCaseDescription
        title={i18n.translate(
          'xpack.securitySolution.siemReadiness.exportMode.coverage.dataSummary.title',
          { defaultMessage: 'Data Coverage Summary & Recommended Actions' }
        )}
        description={dataCoverageDescription}
        hasIssues={hasDataCoverageIssues}
      />
      <EuiSpacer size="xl" />
      <EuiHorizontalRule />

      {/* Quality Section */}
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.securitySolution.siemReadiness.exportMode.quality.title', {
            defaultMessage: 'Quality',
          })}
        </h2>
      </EuiTitle>
      <QualityTab activeCategories={activeCategories} />
      <EuiSpacer size="m" />
      <ExportCaseDescription
        title={i18n.translate(
          'xpack.securitySolution.siemReadiness.exportMode.quality.summary.title',
          { defaultMessage: 'Quality Summary & Recommended Actions' }
        )}
        description={qualityDescription}
        hasIssues={hasQualityIssues}
      />
      <EuiSpacer size="xl" />
      <EuiHorizontalRule />

      {/* Continuity Section */}
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.securitySolution.siemReadiness.exportMode.continuity.title', {
            defaultMessage: 'Continuity',
          })}
        </h2>
      </EuiTitle>
      <ContinuityTab activeCategories={activeCategories} />
      <EuiSpacer size="m" />
      <ExportCaseDescription
        title={i18n.translate(
          'xpack.securitySolution.siemReadiness.exportMode.continuity.summary.title',
          { defaultMessage: 'Continuity Summary & Recommended Actions' }
        )}
        description={continuityDescription}
        hasIssues={hasContinuityIssues}
      />
      <EuiSpacer size="xl" />
      <EuiHorizontalRule />

      {/* Retention Section */}
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.securitySolution.siemReadiness.exportMode.retention.title', {
            defaultMessage: 'Retention',
          })}
        </h2>
      </EuiTitle>
      <RetentionTab activeCategories={activeCategories} />
      <EuiSpacer size="m" />
      <ExportCaseDescription
        title={i18n.translate(
          'xpack.securitySolution.siemReadiness.exportMode.retention.summary.title',
          { defaultMessage: 'Retention Summary & Recommended Actions' }
        )}
        description={retentionDescription}
        hasIssues={hasRetentionIssues}
      />
    </div>
  );
};

ExportModeView.displayName = 'ExportModeView';
