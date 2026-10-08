/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiSelectable, EuiText } from '@elastic/eui';
import type { AlertStatus, TriggerFormValues } from '../../automation_form_values';
import { PillPopover } from '../pills/pill_popover';
import { Sentence, SentenceIcon } from '../pills/sentence';
import { triggerLabels } from '../translations';
import { useRuleCatalog } from '../../../../../hooks/use_rule_catalog';
import { RulePicker } from './rule_picker';
import { rulePillLabel } from './rule_selection';

const ALERT_STATUSES = ['active', 'inactive'] as const;

const AlertStatusPicker = ({
  status,
  onChange,
  readOnly = false,
}: {
  status: AlertStatus;
  onChange: (status: AlertStatus) => void;
  readOnly?: boolean;
}) => {
  const statusLabels = { active: triggerLabels.active, inactive: triggerLabels.recovered };
  const statusHelp = { active: triggerLabels.activeHelp, inactive: triggerLabels.recoveredHelp };
  const selected = status === 'any' ? [] : [status];

  if (readOnly) {
    return <EuiBadge>{status === 'any' ? triggerLabels.anyStatus : statusLabels[status]}</EuiBadge>;
  }

  return (
    <PillPopover
      ariaLabel={triggerLabels.anyStatus}
      label={status === 'any' ? triggerLabels.anyStatus : statusLabels[status]}
      testSubject="automationStatusPicker"
    >
      {() => (
        <EuiSelectable<{ value: Exclude<AlertStatus, 'any'> }>
          aria-label={triggerLabels.anyStatus}
          options={ALERT_STATUSES.map((value) => ({
            key: value,
            value,
            label: statusLabels[value],
            checked: selected.includes(value) ? 'on' : undefined,
          }))}
          renderOption={({ label, value }) => (
            <>
              <EuiText size="s">{label}</EuiText>
              <EuiText size="xs" color="subdued">
                {statusHelp[value]}
              </EuiText>
            </>
          )}
          onChange={(options) => {
            const checked = options.filter((option) => option.checked === 'on');
            onChange(checked.length === 1 ? checked[0].value : 'any');
          }}
          listProps={{ bordered: false, paddingSize: 's', rowHeight: 56, isVirtualized: false }}
        >
          {(list) => <div css={{ width: 300 }}>{list}</div>}
        </EuiSelectable>
      )}
    </PillPopover>
  );
};

export const AlertTriggerEditor = ({
  trigger,
  onChange,
  readOnly = false,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'alert' }>;
  onChange: (trigger: TriggerFormValues) => void;
  readOnly?: boolean;
}) => {
  const { data: catalog = [] } = useRuleCatalog();
  const { ruleNamePattern, ruleNames, ruleTags } = trigger;
  const rulesLabel =
    ruleNamePattern.trim() && ruleNames.length === 0 && ruleTags.length === 0
      ? ruleNamePattern.trim()
      : rulePillLabel(catalog, { ruleNames, ruleTags });

  return (
    <Sentence>
      <SentenceIcon type="logoElastic" />
      <EuiText size="s">
        <strong>{triggerLabels.whenAnAlert}</strong>
      </EuiText>
      <EuiText size="s">{triggerLabels.from}</EuiText>
      {readOnly ? (
        <EuiBadge>{rulesLabel}</EuiBadge>
      ) : (
        <PillPopover
          ariaLabel={triggerLabels.anyRule}
          label={rulesLabel}
          testSubject="automationRulePicker"
        >
          {() => <RulePicker trigger={trigger} onChange={onChange} />}
        </PillPopover>
      )}
      <EuiText size="s">{triggerLabels.changesTo}</EuiText>
      <AlertStatusPicker
        status={trigger.alertStatus}
        onChange={(alertStatus) => onChange({ ...trigger, alertStatus })}
        readOnly={readOnly}
      />
    </Sentence>
  );
};
