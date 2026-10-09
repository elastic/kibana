/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';

export function OtelAddDataInstructions() {
  const {
    start: { core },
  } = useProfilingDependencies();

  return (
    <EuiEmptyPrompt
      data-test-subj="profilingOtelAddDataInstructions"
      iconType="logoObservability"
      title={
        <h2>
          {i18n.translate('xpack.profiling.addData.openTelemetry.title', {
            defaultMessage: 'OpenTelemetry Profiles',
          })}
        </h2>
      }
      body={i18n.translate('xpack.profiling.addData.openTelemetry.description', {
        defaultMessage:
          'The easiest way to start ingesting profiles is by installing the OpenTelemetry Profiling integration. It walks you through deploying the profiler with Elastic Agent and sending the profiles to this deployment.',
      })}
      actions={
        <EuiButton
          data-test-subj="profilingAddDataViewOtelIntegrationButton"
          fill
          iconType="plusCircle"
          // No version in the package key: Fleet resolves the installed version or the latest one
          href={core.http.basePath.prepend('/app/integrations/detail/profiling_otel/overview')}
        >
          {i18n.translate('xpack.profiling.addData.openTelemetry.integrationButton', {
            defaultMessage: 'Add OpenTelemetry Profiling integration',
          })}
        </EuiButton>
      }
    />
  );
}
