/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiCodeBlock, EuiCopy, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OtelOs } from './install_step';

interface OtelLogsStartStepProps {
  os: OtelOs;
  useInlineCopyOnly?: boolean;
  useColoredSyntax?: boolean;
}

const START_COMMANDS: Readonly<Record<OtelOs, string>> = {
  linux: 'sudo ./otelcol --config otel.yml',
  mac: './otelcol --config otel.yml',
  windows: '.\\otelcol.ps1 --config otel.yml',
} as const;

export const OtelLogsStartStep: React.FC<OtelLogsStartStepProps> = ({
  os,
  useInlineCopyOnly = false,
  useColoredSyntax = false,
}) => {
  const startCommand = START_COMMANDS[os];
  const codeLanguage = os === 'windows' ? 'powershell' : useColoredSyntax ? 'bash' : 'yaml';

  return (
    <EuiFlexGroup direction="column">
      <EuiCallOut
        title={i18n.translate('xpack.observability_onboarding.otelLogsPanel.limitationTitle', {
          defaultMessage: 'Configuration Information',
        })}
        color="warning"
        iconType="info"
      >
        <p>
          {i18n.translate(
            'xpack.observability_onboarding.otelLogsPanel.historicalDataDescription',
            { defaultMessage: 'New log messages are collected from the setup onward.' }
          )}
        </p>
        <p>
          {os === 'windows'
            ? i18n.translate('xpack.observability_onboarding.otelLogsPanel.windowsLogDescription', {
                defaultMessage:
                  'On Windows, logs are collected from the Windows Event Log. You can customize this in the otel.yml file.',
              })
            : i18n.translate(
                'xpack.observability_onboarding.otelLogsPanel.historicalDataDescription2',
                {
                  defaultMessage:
                    'The default log path is /var/log/*. You can change this path in the otel.yml file if needed.',
                }
              )}
        </p>
      </EuiCallOut>

      <EuiText>
        <p>
          {i18n.translate('xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorLabel', {
            defaultMessage: 'Run the following command to start the collector',
          })}
        </p>
      </EuiText>

      <EuiCodeBlock language={codeLanguage} isCopyable={useInlineCopyOnly}>
        {startCommand}
      </EuiCodeBlock>
      {!useInlineCopyOnly && (
        <EuiCopy textToCopy={startCommand}>
          {(copy) => (
            <EuiButton
              data-test-subj="observabilityOnboardingCopyableCodeBlockCopyToClipboardButton"
              iconType="copy"
              onClick={copy}
            >
              {i18n.translate(
                'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
                { defaultMessage: 'Copy to clipboard' }
              )}
            </EuiButton>
          )}
        </EuiCopy>
      )}
    </EuiFlexGroup>
  );
};
