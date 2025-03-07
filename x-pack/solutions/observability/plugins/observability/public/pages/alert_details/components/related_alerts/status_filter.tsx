/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  AlertStatus,
} from '@kbn/rule-data-utils';
import React, { useState } from 'react';

interface Props {
  status?: AlertStatus;
  onChange: (status?: AlertStatus) => void;
}

const STATUSES: Array<{ value: AlertStatus; label: string; filter: Filter }> = [
  {
    value: ALERT_STATUS_ACTIVE,
    label: 'Active',
    filter: {
      query: {
        match_phrase: {
          [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
        },
      },
      meta: {},
    },
  },
  {
    value: ALERT_STATUS_RECOVERED,
    label: 'Recovered',
    filter: {
      query: {
        match_phrase: {
          [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
        },
      },
      meta: {},
    },
  },
  {
    value: ALERT_STATUS_UNTRACKED,
    label: 'Untracked',
    filter: {
      query: {
        match_phrase: {
          [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
        },
      },
      meta: {},
    },
  },
];

export const getAssociatedStatusFilter = (status?: AlertStatus): Filter | undefined => {
  if (!status) return undefined;
  return STATUSES.find((s) => s.value === status)?.filter;
};

const options: Array<EuiComboBoxOptionOption<AlertStatus>> = STATUSES.map(({ value, label }) => ({
  value,
  label,
}));

export function StatusFilter({ status, onChange }: Props) {
  const [selected, setSelected] = useState<AlertStatus | undefined>(status);
  return (
    <EuiFormRow label="Status">
      <EuiComboBox
        compressed
        isClearable
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={options.filter((opt) => opt.value === selected)}
        onChange={(selectedOptions: Array<EuiComboBoxOptionOption<AlertStatus>>) => {
          if (selectedOptions.length) {
            setSelected(selectedOptions[0].value!);
            onChange(selectedOptions[0].value!);
          } else {
            setSelected(undefined);
            onChange(undefined);
          }
        }}
      />
    </EuiFormRow>
  );
}
