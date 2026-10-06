/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiComboBox,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type { AlertStatus, TriggerFormValues } from '../../automation_form_values';
import { PillPopover } from '../pills/pill_popover';
import { Sentence } from '../pills/sentence';
import { triggerLabels } from '../translations';

const ALERT_STATUSES = ['active', 'inactive'] as const;

const AlertStatusPicker = ({
  status,
  onChange,
}: {
  status: AlertStatus;
  onChange: (status: AlertStatus) => void;
}) => {
  const statusLabels = { active: triggerLabels.active, inactive: triggerLabels.recovered };
  const statusHelp = { active: triggerLabels.activeHelp, inactive: triggerLabels.recoveredHelp };
  const selected = status === 'any' ? [] : [status];

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
}: {
  trigger: Extract<TriggerFormValues, { kind: 'alert' }>;
  onChange: (trigger: TriggerFormValues) => void;
}) => {
  return (
    <Sentence>
      <EuiIcon type="logoElastic" aria-hidden={true} />
      <EuiText size="s">
        <strong>{triggerLabels.whenAnAlert}</strong>
      </EuiText>
      <EuiText size="s">{triggerLabels.from}</EuiText>
      <PillPopover
        ariaLabel={triggerLabels.anyRule}
        label={
          [trigger.ruleNamePattern.trim(), ...trigger.ruleTags].filter(Boolean).join(', ') ||
          triggerLabels.anyRule
        }
        testSubject="automationRulePicker"
      >
        {() => (
          <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 300 }}>
            <EuiFormRow label={triggerLabels.ruleName} helpText={triggerLabels.ruleNameHelp}>
              <EuiFieldText
                compressed
                value={trigger.ruleNamePattern}
                onChange={(event) => onChange({ ...trigger, ruleNamePattern: event.target.value })}
                data-test-subj="automationRuleNamePattern"
              />
            </EuiFormRow>
            <EuiFormRow label={triggerLabels.tags}>
              <EuiComboBox
                compressed
                noSuggestions
                selectedOptions={trigger.ruleTags.map((tag) => ({ label: tag }))}
                onCreateOption={(tag) =>
                  onChange({ ...trigger, ruleTags: [...new Set([...trigger.ruleTags, tag])] })
                }
                onChange={(options) =>
                  onChange({ ...trigger, ruleTags: options.map(({ label }) => label) })
                }
              />
            </EuiFormRow>
          </EuiPanel>
        )}
      </PillPopover>
      <EuiText size="s">{triggerLabels.changesTo}</EuiText>
      <AlertStatusPicker
        status={trigger.alertStatus}
        onChange={(alertStatus) => onChange({ ...trigger, alertStatus })}
      />
    </Sentence>
  );
};
