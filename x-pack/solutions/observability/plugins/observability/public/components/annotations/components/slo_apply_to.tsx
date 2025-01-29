/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { ALL_VALUE } from '@kbn/slo-schema';
import React from 'react';
import { Annotation } from '../../../../common/annotations';
import { SloSelector } from './slo_selector';

export function SLOApplyTo({ editAnnotation }: { editAnnotation?: Annotation | null }) {
  const { control } = useFormContext<Annotation>();

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.annotationMeta.euiFormRow.sloLabel', {
        defaultMessage: 'SLOs',
      })}
      display="columnCompressed"
      fullWidth={true}
    >
      <Controller
        defaultValue={editAnnotation?.slo}
        name="slo"
        control={control}
        render={({ field }) => (
          <SloSelector
            value={field.value}
            onSelected={(newValue) => {
              const { slo, all } = newValue;
              if (all) {
                field.onChange({
                  id: ALL_VALUE,
                });
              } else {
                field.onChange(slo);
              }
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}
