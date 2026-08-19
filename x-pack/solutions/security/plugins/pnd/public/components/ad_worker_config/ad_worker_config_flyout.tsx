/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertRetrievalSection } from './alert_retrieval_section';
import { GenerationSection } from './generation_section';
import { ValidationSection } from './validation_section';
import { PipelineIndicator } from './vendored/pipeline_indicator';
import { StepAccordion } from './vendored/step_accordion';
import type { AttackDiscoveryWorkerConfig } from './types';
import { DEFAULT_AD_WORKER_CONFIG, toWorkerInputs } from './types';

interface Props {
  onClose: () => void;
}

/**
 * POC flyout that renders the Attack Discovery Worker configuration as a numbered steps timeline
 * (Alert retrieval → Generation → Validation), reusing the AD flyout's StepAccordion / PipelineIndicator
 * / QueryModeSelector (vendored for the spike). State is local and NOT persisted — the "Resulting
 * worker inputs" panel shows the collected config.
 */
export const AdWorkerConfigFlyout: React.FC<Props> = ({ onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'adWorkerConfigFlyoutTitle' });
  const [config, setConfig] = useState<AttackDiscoveryWorkerConfig>(DEFAULT_AD_WORKER_CONFIG);

  const onChange = useCallback((patch: Partial<AttackDiscoveryWorkerConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="adWorkerConfigFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.pnd.adWorkerConfig.flyoutTitle', {
              defaultMessage: 'Configure Attack Discovery Worker',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <PipelineIndicator />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <StepAccordion
          stepNumber="1"
          isLast={false}
          data-test-subj="adWorkerStepRetrieval"
          title={i18n.translate('xpack.pnd.adWorkerConfig.step.retrievalTitle', {
            defaultMessage: 'Alert retrieval method',
          })}
          description={i18n.translate('xpack.pnd.adWorkerConfig.step.retrievalDescription', {
            defaultMessage: 'Choose how alerts are retrieved before generation.',
          })}
        >
          <AlertRetrievalSection value={config} onChange={onChange} />
        </StepAccordion>

        <StepAccordion
          stepNumber="2"
          isLast={false}
          data-test-subj="adWorkerStepGeneration"
          title={i18n.translate('xpack.pnd.adWorkerConfig.step.generationTitle', {
            defaultMessage: 'Generation',
          })}
          description={i18n.translate('xpack.pnd.adWorkerConfig.step.generationDescription', {
            defaultMessage: 'Select the connector and cadence for generating attack discoveries.',
          })}
        >
          <GenerationSection value={config} onChange={onChange} />
        </StepAccordion>

        <StepAccordion
          stepNumber="3"
          isLast={true}
          data-test-subj="adWorkerStepValidation"
          title={i18n.translate('xpack.pnd.adWorkerConfig.step.validationTitle', {
            defaultMessage: 'Validation',
          })}
          description={i18n.translate('xpack.pnd.adWorkerConfig.step.validationDescription', {
            defaultMessage: 'Choose the workflow that validates generated discoveries.',
          })}
        >
          <ValidationSection value={config} onChange={onChange} />
        </StepAccordion>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.pnd.adWorkerConfig.previewTitle', {
              defaultMessage: 'Resulting worker inputs',
            })}
          </h3>
        </EuiTitle>
        <EuiText color="subdued" size="xs">
          <p>
            {i18n.translate('xpack.pnd.adWorkerConfig.previewNote', {
              defaultMessage:
                'Passed as inputs to the security.attack-discovery.run step (run_every drives the orchestrator schedule). Not persisted in this preview.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" isCopyable data-test-subj="adWorkerConfigPreview">
          {JSON.stringify(toWorkerInputs(config), null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="cross"
          onClick={onClose}
          flush="left"
          data-test-subj="adWorkerConfigClose"
        >
          {i18n.translate('xpack.pnd.adWorkerConfig.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
