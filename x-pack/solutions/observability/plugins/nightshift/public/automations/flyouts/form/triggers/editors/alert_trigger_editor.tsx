/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiComboBox, EuiFormRow, EuiPanel, EuiSelectable, EuiText } from '@elastic/eui';
import { useGetRuleTagsQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useRuleNameSuggestions } from '../../../../../hooks/use_rule_name_suggestions';
import type { AlertStatus, TriggerFormValues } from '../../automation_form_values';
import { PillPopover } from '../pills/pill_popover';
import { Sentence, SentenceIcon } from '../pills/sentence';
import { triggerLabels } from '../translations';

const SUGGESTIONS_DEBOUNCE_MS = 300;

const ALERT_STATUSES = ['active', 'inactive'] as const;

const RulePickerFields = ({
  trigger,
  onChange,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'alert' }>;
  onChange: (trigger: TriggerFormValues) => void;
}) => {
  const { http, notifications } = useKibana().services;
  const [nameSearch, setNameSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const debouncedNameSearch = useDebouncedValue(nameSearch, SUGGESTIONS_DEBOUNCE_MS);
  const debouncedTagSearch = useDebouncedValue(tagSearch, SUGGESTIONS_DEBOUNCE_MS);
  const { data: ruleNames = [], isFetching: isLoadingNames } =
    useRuleNameSuggestions(debouncedNameSearch);
  const { tags, isLoading: isLoadingTags } = useGetRuleTagsQuery({
    enabled: true,
    search: debouncedTagSearch,
    perPage: 50,
    http,
    toasts: notifications.toasts,
  });

  return (
    <>
      <EuiFormRow label={triggerLabels.ruleName} helpText={triggerLabels.ruleNameHelp}>
        <EuiComboBox
          compressed
          singleSelection={{ asPlainText: true }}
          isLoading={isLoadingNames}
          options={ruleNames.map((label) => ({ label }))}
          selectedOptions={trigger.ruleNamePattern ? [{ label: trigger.ruleNamePattern }] : []}
          onSearchChange={setNameSearch}
          onBlur={() => nameSearch && onChange({ ...trigger, ruleNamePattern: nameSearch })}
          onCreateOption={(ruleNamePattern) => onChange({ ...trigger, ruleNamePattern })}
          onChange={(options) => onChange({ ...trigger, ruleNamePattern: options[0]?.label ?? '' })}
          data-test-subj="automationRuleNamePattern"
        />
      </EuiFormRow>
      <EuiFormRow label={triggerLabels.tags}>
        <EuiComboBox
          compressed
          isLoading={isLoadingTags}
          options={tags.map((label) => ({ label }))}
          selectedOptions={trigger.ruleTags.map((tag) => ({ label: tag }))}
          onSearchChange={setTagSearch}
          onCreateOption={(tag) =>
            onChange({ ...trigger, ruleTags: [...new Set([...trigger.ruleTags, tag])] })
          }
          onChange={(options) =>
            onChange({ ...trigger, ruleTags: options.map(({ label }) => label) })
          }
        />
      </EuiFormRow>
    </>
  );
};

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
  return (
    <Sentence>
      <SentenceIcon type="logoElastic" />
      <EuiText size="s">
        <strong>{triggerLabels.whenAnAlert}</strong>
      </EuiText>
      <EuiText size="s">{triggerLabels.from}</EuiText>
      {readOnly ? (
        <EuiBadge>
          {[trigger.ruleNamePattern, ...trigger.ruleTags].filter(Boolean).join(', ') ||
            triggerLabels.anyRule}
        </EuiBadge>
      ) : (
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
              <RulePickerFields trigger={trigger} onChange={onChange} />
            </EuiPanel>
          )}
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
