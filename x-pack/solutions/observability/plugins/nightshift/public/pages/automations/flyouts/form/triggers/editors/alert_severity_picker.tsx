/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_SEVERITY_VALUES, type AlertSeverity } from '@kbn/rule-data-utils';
import { PillPopover } from '../pills/pill_popover';
import { alertSeverityLabels, alertSeverityOptions } from '../translations';

export const AlertSeverityPicker = ({
  values,
  supportedValues,
  isInvalid,
  onChange,
  readOnly,
}: {
  values: AlertSeverity[];
  supportedValues: readonly AlertSeverity[];
  isInvalid: boolean;
  onChange: (values: AlertSeverity[]) => void;
  readOnly: boolean;
}) => {
  const label = values.length
    ? i18n.formatList(
        'disjunction',
        values.map((value) => alertSeverityOptions[value])
      )
    : alertSeverityLabels.any;

  if (readOnly) return <EuiBadge>{label}</EuiBadge>;

  return (
    <PillPopover
      ariaLabel={alertSeverityLabels.title}
      label={label}
      testSubject="automationAlertSeverity"
      isInvalid={isInvalid}
    >
      {() => (
        <EuiSelectable<{ value: AlertSeverity }>
          aria-label={alertSeverityLabels.title}
          options={ALERT_SEVERITY_VALUES.filter(
            (value) => supportedValues.includes(value) || values.includes(value)
          ).map((value) => ({
            key: value,
            value,
            label: alertSeverityOptions[value],
            checked: values.includes(value) ? 'on' : undefined,
          }))}
          onChange={(options) =>
            onChange(options.filter(({ checked }) => checked === 'on').map(({ value }) => value))
          }
          listProps={{ bordered: false, paddingSize: 's' }}
        >
          {(list) => <div css={{ minWidth: 200 }}>{list}</div>}
        </EuiSelectable>
      )}
    </PillPopover>
  );
};
