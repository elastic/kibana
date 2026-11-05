/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { TriggerFormValues } from '../../automation_form_values';
import { PillPopover } from '../pills/pill_popover';
import { Sentence, SentenceIcon } from '../pills/sentence';
import { alertSeverityLabels, triggerLabels } from '../translations';
import { useRuleCatalog } from '../../../../../data/rules/use_rule_catalog';
import { RulePicker } from './rule_picker';
import { rulePillLabel } from './rule_selection';
import { AlertSeverityPicker } from './alert_severity_picker';

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
    <>
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
        <EuiBadge>{triggerLabels.active}</EuiBadge>
        {(!readOnly || trigger.severities.length > 0) && (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{alertSeverityLabels.withSeverity}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AlertSeverityPicker
                values={trigger.severities}
                onChange={(severities) => onChange({ ...trigger, severities })}
                readOnly={readOnly}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Sentence>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {alertSeverityLabels.help}
      </EuiText>
    </>
  );
};
