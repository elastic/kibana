/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { CorrelationReport } from '../components/correlation_report';
import { useCorrelationFindings } from '../hooks/use_correlation_findings';

export const CorrelationReportPage: FC = () => {
  const skillEnabled = useIsExperimentalFeatureEnabled('threatIntelligenceSkillEnabled');
  const [reportId, setReportId] = useState('');
  const runIdRef = useRef<string | undefined>(undefined);
  const { loading, data, error, correlate } = useCorrelationFindings();

  const handleCorrelate = useCallback(() => {
    const trimmed = reportId.trim();
    if (!trimmed) return;
    runIdRef.current = crypto.randomUUID();
    void correlate(trimmed);
  }, [correlate, reportId]);

  const handleRetry = useCallback(() => {
    const trimmed = reportId.trim();
    if (!trimmed) return;
    runIdRef.current = crypto.randomUUID();
    void correlate(trimmed);
  }, [correlate, reportId]);

  if (!skillEnabled) {
    return (
      <EuiPageTemplate restrictWidth={false} grow>
        <EuiPageTemplate.Header
          pageTitle={i18n.translate(
            'xpack.securitySolution.threatIntelligence.correlationReport.pageTitle',
            { defaultMessage: 'Correlation Report' }
          )}
        />
        <EuiPageTemplate.Section>
          <EuiCallOut
            title={i18n.translate(
              'xpack.securitySolution.threatIntelligence.correlationReport.featureDisabledTitle',
              { defaultMessage: 'Feature not enabled' }
            )}
            color="warning"
            iconType="lock"
            data-test-subj="correlationReportFeatureDisabled"
          >
            <EuiText size="s">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.correlationReport.featureDisabledBody',
                {
                  defaultMessage:
                    'The Threat Intelligence Skill feature must be enabled to use this page. Add `threatIntelligenceSkillEnabled` to `xpack.securitySolution.enableExperimental` in your Kibana configuration.',
                }
              )}
            </EuiText>
          </EuiCallOut>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate restrictWidth={false} grow>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate(
          'xpack.securitySolution.threatIntelligence.correlationReport.pageTitle',
          { defaultMessage: 'Correlation Report' }
        )}
        description={i18n.translate(
          'xpack.securitySolution.threatIntelligence.correlationReport.pageDescription',
          {
            defaultMessage:
              'Correlate a stored threat report against the knowledge base using the Diamond Model pipeline.',
          }
        )}
      />
      <EuiPageTemplate.Section>
        <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationReportInputPanel">
          <EuiFlexGroup gutterSize="m" alignItems="flexEnd" wrap>
            <EuiFlexItem style={{ minWidth: 360 }}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.securitySolution.threatIntelligence.correlationReport.reportIdLabel',
                  { defaultMessage: 'Report ID' }
                )}
                helpText={i18n.translate(
                  'xpack.securitySolution.threatIntelligence.correlationReport.reportIdHelp',
                  {
                    defaultMessage:
                      'The Elasticsearch document ID of the stored threat report to correlate.',
                  }
                )}
              >
                <EuiFieldText
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && reportId.trim() && !loading) handleCorrelate();
                  }}
                  placeholder={i18n.translate(
                    'xpack.securitySolution.threatIntelligence.correlationReport.reportIdPlaceholder',
                    { defaultMessage: 'e.g. report_abc123' }
                  )}
                  disabled={loading}
                  data-test-subj="correlationReportIdInput"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButton
                  fill
                  isDisabled={!reportId.trim() || loading}
                  isLoading={loading}
                  onClick={handleCorrelate}
                  data-test-subj="correlationReportCorrelateBtn"
                >
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.correlationReport.correlateBtn',
                    { defaultMessage: 'Correlate' }
                  )}
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        {loading && (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            title={
              <h2>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.correlationReport.loadingTitle',
                  { defaultMessage: 'Running correlation…' }
                )}
              </h2>
            }
            body={
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.correlationReport.loadingBody',
                  {
                    defaultMessage:
                      'Correlation can take 1–2 minutes. The pipeline searches the knowledge base, triages candidates, and synthesizes findings with an LLM.',
                  }
                )}
              </EuiText>
            }
            data-test-subj="correlationReportLoading"
          />
        )}

        {!loading && error && (
          <EuiCallOut
            title={i18n.translate(
              'xpack.securitySolution.threatIntelligence.correlationReport.errorTitle',
              { defaultMessage: 'Correlation failed' }
            )}
            color="danger"
            iconType="alert"
            data-test-subj="correlationReportError"
          >
            <EuiText size="s">{error}</EuiText>
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              color="danger"
              onClick={handleRetry}
              data-test-subj="correlationReportRetryBtn"
            >
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.correlationReport.retryBtn',
                { defaultMessage: 'Retry' }
              )}
            </EuiButton>
          </EuiCallOut>
        )}

        {!loading && data && (
          <CorrelationReport
            findings={data}
            candidateMeta={data.candidate_meta}
            title={reportId.trim() || undefined}
            runId={runIdRef.current}
          />
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
