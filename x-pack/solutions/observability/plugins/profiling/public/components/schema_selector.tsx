/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFormLabel, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import React from 'react';

const options: Array<EuiSuperSelectOption<ProfilingSchema>> = [
  {
    value: 'ecs',
    inputDisplay: i18n.translate('xpack.profiling.schemaSelector.ecs', {
      defaultMessage: 'Elastic (ECS)',
    }),
  },
  {
    value: 'otel',
    inputDisplay: i18n.translate('xpack.profiling.schemaSelector.otel', {
      defaultMessage: 'OpenTelemetry',
    }),
  },
];

const label = i18n.translate('xpack.profiling.schemaSelector.label', {
  defaultMessage: 'Schema',
});

export function SchemaSelector({
  value,
  onChange,
}: {
  value: ProfilingSchema;
  onChange: (schema: ProfilingSchema) => void;
}) {
  return (
    <EuiSuperSelect
      data-test-subj="profilingSchemaSelect"
      aria-label={label}
      prepend={<EuiFormLabel>{label}</EuiFormLabel>}
      compressed
      options={options}
      valueOfSelected={value}
      onChange={onChange}
    />
  );
}
