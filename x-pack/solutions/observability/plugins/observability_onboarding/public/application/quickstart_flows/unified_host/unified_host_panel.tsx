/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AutoDetectPanel } from '../auto_detect';
import { OtelLogsPanel } from '../otel_logs';

export type HostPlatform = 'linux' | 'mac' | 'windows';
export type HostCollector = 'agent' | 'otel';

interface UnifiedHostPanelProps {
  platform: HostPlatform;
  defaultCollector?: HostCollector;
}

const COLLECTOR_OPTIONS = [
  {
    id: 'agent' as const,
    label: i18n.translate('xpack.observability_onboarding.unifiedHostPanel.collectorToggle.agent', {
      defaultMessage: 'Elastic Agent',
    }),
  },
  {
    id: 'otel' as const,
    label: i18n.translate('xpack.observability_onboarding.unifiedHostPanel.collectorToggle.otel', {
      defaultMessage: 'OpenTelemetry',
    }),
  },
];

export const UnifiedHostPanel: React.FC<UnifiedHostPanelProps> = ({
  platform,
  defaultCollector = 'agent',
}) => {
  const [selectedCollector, setSelectedCollector] = useState<HostCollector>(defaultCollector);

  // No Elastic Agent auto-detect flow exists for Windows today, so force OTel there.
  const isWindows = platform === 'windows';
  const collector: HostCollector = isWindows ? 'otel' : selectedCollector;

  return (
    <>
      {!isWindows && (
        <>
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.observability_onboarding.unifiedHostPanel.collectorToggle.legend',
              { defaultMessage: 'Select collection method' }
            )}
            idSelected={collector}
            onChange={(optionId) => setSelectedCollector(optionId as HostCollector)}
            options={COLLECTOR_OPTIONS}
            buttonSize="m"
            isFullWidth
          />
          <EuiSpacer size="l" />
        </>
      )}
      {collector === 'agent' ? <AutoDetectPanel /> : <OtelLogsPanel lockedPlatform={platform} />}
    </>
  );
};
