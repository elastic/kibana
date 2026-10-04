/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import {
  createTriggerFormValues,
  isSlackTrigger,
  type TriggerFormValues,
} from '../automation_form_values';
import { DailyLimitField } from './daily_limit_field';
import { AlertTriggerEditor } from './editors/alert_trigger_editor';
import { CronTriggerEditor } from './editors/cron_trigger_editor';
import { EveryTriggerEditor } from './editors/every_trigger_editor';
import { SlackTriggerEditor } from './editors/slack_trigger_editor';
import { triggerLabels } from './translations';
import { TriggerPicker } from './trigger_picker';
import { TriggerRow } from './trigger_row';
import { hasDailyLimit } from '../validation';

export const AutomationTriggerSection = ({
  trigger,
  dailyDispatchLimit,
  onTriggerChange,
  onDailyDispatchLimitChange,
  readOnly = false,
}: {
  trigger?: TriggerFormValues;
  dailyDispatchLimit: string;
  onTriggerChange: (trigger?: TriggerFormValues) => void;
  onDailyDispatchLimitChange: (value: string) => void;
  readOnly?: boolean;
}) => {
  const [stashedTriggers, setStashedTriggers] = useState<
    Partial<Record<TriggerFormValues['kind'], TriggerFormValues>>
  >({});
  const selectTrigger = (kind: TriggerFormValues['kind']) => {
    if (trigger) setStashedTriggers((stash) => ({ ...stash, [trigger.kind]: trigger }));
    onTriggerChange(stashedTriggers[kind] ?? createTriggerFormValues(kind));
  };

  return (
    <>
      {!readOnly && (
        <EuiTitle size="xs">
          <h3>{triggerLabels.triggers}</h3>
        </EuiTitle>
      )}
      <EuiSpacer size="s" />
      <EuiPanel hasBorder hasShadow={false} paddingSize={trigger ? 's' : 'm'}>
        {!trigger && (
          <>
            <EuiText size="s" color="subdued">
              {triggerLabels.empty}
            </EuiText>
            <EuiSpacer size="s" />
            <TriggerPicker
              onSelect={selectTrigger}
              button={(toggle) =>
                readOnly ? (
                  <></>
                ) : (
                  <EuiButtonEmpty
                    iconType="plus"
                    color="text"
                    flush="left"
                    onClick={toggle}
                    data-test-subj="automationAddTrigger"
                  >
                    {triggerLabels.addTrigger}
                  </EuiButtonEmpty>
                )
              }
            />
          </>
        )}
        {trigger && (
          <TriggerRow
            trigger={trigger}
            onSelect={selectTrigger}
            onRemove={() => onTriggerChange(undefined)}
            readOnly={readOnly}
          >
            {trigger.kind === 'alert' && (
              <AlertTriggerEditor
                trigger={trigger}
                onChange={onTriggerChange}
                readOnly={readOnly}
              />
            )}
            {trigger.kind === 'every' && (
              <EveryTriggerEditor
                trigger={trigger}
                onChange={onTriggerChange}
                readOnly={readOnly}
              />
            )}
            {trigger.kind === 'cron' && (
              <CronTriggerEditor trigger={trigger} onChange={onTriggerChange} readOnly={readOnly} />
            )}
            {isSlackTrigger(trigger) && (
              <SlackTriggerEditor
                trigger={trigger}
                onChange={onTriggerChange}
                readOnly={readOnly}
              />
            )}
          </TriggerRow>
        )}
        {trigger && hasDailyLimit(trigger) && (
          <DailyLimitField
            value={dailyDispatchLimit}
            helpText={
              isSlackTrigger(trigger)
                ? triggerLabels.slackDailyLimitHelp
                : triggerLabels.dailyLimitHelp
            }
            onChange={onDailyDispatchLimitChange}
            readOnly={readOnly}
          />
        )}
      </EuiPanel>
    </>
  );
};
