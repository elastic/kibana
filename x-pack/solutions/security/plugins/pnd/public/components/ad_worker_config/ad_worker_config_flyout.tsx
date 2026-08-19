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
  EuiForm,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertRetrievalSection } from './alert_retrieval_section';
import { GenerationSection } from './generation_section';
import { ValidationSection } from './validation_section';
import type { AttackDiscoveryWorkerConfig } from './types';
import { DEFAULT_AD_WORKER_CONFIG } from './types';

interface Props {
  onClose: () => void;
}

/**
 * POC flyout that renders the Attack Discovery Worker configuration controls (alert retrieval,
 * generation, validation). State is local and NOT persisted — the "Resulting worker inputs" panel
 * shows that the collected config equals a valid `security.attack-discovery.run` inputs object.
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm component="form">
          <AlertRetrievalSection value={config} onChange={onChange} />
          <EuiHorizontalRule />
          <GenerationSection value={config} onChange={onChange} />
          <EuiHorizontalRule />
          <ValidationSection value={config} onChange={onChange} />
        </EuiForm>

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
                'Passed as inputs to the security.attack-discovery.run step. Not persisted in this preview.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" isCopyable data-test-subj="adWorkerConfigPreview">
          {JSON.stringify(config, null, 2)}
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
