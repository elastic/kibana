/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const OTEL_ADD_DATA_DESCRIPTION = i18n.translate(
  'xpack.profiling.addDataView.otel.description',
  { defaultMessage: 'Send profiling data to Elasticsearch with OpenTelemetry.' }
);

export function OtelAddDataInstructions() {
  return (
    <EuiText data-test-subj="profilingOtelAddDataInstructions">
      <p>{OTEL_ADD_DATA_DESCRIPTION}</p>
    </EuiText>
  );
}
