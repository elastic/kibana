/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useEnabledProfilingStatus } from '../../components/contexts/profiling_status/use_enabled_profiling_status';

export const OTEL_NOT_SUPPORTED_CALLOUT_DISMISSED_STORAGE_KEY =
  'xpack.profiling.storageExplorer.otelNotSupportedCalloutDismissed';

export const OTEL_NOT_SUPPORTED_CALLOUT_TITLE = i18n.translate(
  'xpack.profiling.storageExplorer.otelNotSupportedCallout.title',
  { defaultMessage: "OpenTelemetry profiling data isn't shown here yet" }
);

export const OTEL_NOT_SUPPORTED_CALLOUT_BODY = i18n.translate(
  'xpack.profiling.storageExplorer.otelNotSupportedCallout.body',
  {
    defaultMessage:
      'Storage explorer currently only reports Universal Profiling data. Support for OpenTelemetry profiling is coming in a future release.',
  }
);

export function OtelNotSupportedCallout() {
  const {
    data: { otel },
  } = useEnabledProfilingStatus();
  const [isDismissed, setIsDismissed] = useLocalStorage(
    OTEL_NOT_SUPPORTED_CALLOUT_DISMISSED_STORAGE_KEY,
    false
  );

  if (!otel.hasData || isDismissed) {
    return null;
  }

  return (
    <KbnWarningCallout
      data-test-subj="profilingStorageExplorerOtelNotSupportedCallout"
      title={OTEL_NOT_SUPPORTED_CALLOUT_TITLE}
      text={OTEL_NOT_SUPPORTED_CALLOUT_BODY}
      onDismiss={() => setIsDismissed(true)}
      dismissButtonProps={{
        'data-test-subj': 'profilingStorageExplorerOtelNotSupportedCalloutDismissButton',
      }}
    />
  );
}
