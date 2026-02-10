/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { DashboardsSelector } from '@kbn/dashboards-selector';
import type { CreateSLOForm } from '../../types';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSloFormContext } from '../slo_form_context';
import { OptionalText } from '../common/optional_text';

const DASHBOARDS_COMBOBOX_PLACEHOLDER = i18n.translate('xpack.slo.sloEdit.dashboards.placeholder', {
  defaultMessage: 'Add dashboards',
});

export function DashboardsField() {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();
  const { services } = useKibana();
  const { uiActions } = services;

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      label={i18n.translate('xpack.slo.sloEdit.dashboards.label', {
        defaultMessage: 'Linked dashboards',
      })}
      labelAppend={<OptionalText />}
    >
      <Controller
        name="artifacts.dashboards"
        control={control}
        defaultValue={undefined}
        render={({ field }) => (
          <DashboardsSelector
            uiActions={uiActions}
            dashboardsFormData={field.value ?? []}
            placeholder={DASHBOARDS_COMBOBOX_PLACEHOLDER}
            onChange={(selected) => field.onChange(selected.map((d) => ({ id: d.value })))}
          />
        )}
      />
    </EuiFormRow>
  );
}
