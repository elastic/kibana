/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { WatchTriggersSettings } from '@kbn/pnd-common';
import { SettingsSection } from './settings_section';
import * as i18n from '../settings_translations';

interface WatchTriggersSectionProps {
  triggers: WatchTriggersSettings;
  onScheduleChange: (scheduleId: string) => void;
  onManualRunChange: (allowManualRun: boolean) => void;
}

export const WatchTriggersSection: React.FC<WatchTriggersSectionProps> = ({
  triggers,
  onScheduleChange,
  onManualRunChange,
}) => {
  const { sharedWithAttackDiscovery, schedule, allowManualRun } = triggers;

  return (
    <SettingsSection
      title={i18n.TRIGGERS_SECTION_TITLE}
      subtitle={i18n.TRIGGERS_SECTION_SUBTITLE}
      data-test-subj="pndWatchTriggersSection"
    >
      {sharedWithAttackDiscovery ? (
        <>
          <KbnInfoCallout
            announceOnMount
            title={i18n.AD_SHARED_CALLOUT_TITLE}
            text={<p>{i18n.AD_SHARED_CALLOUT_BODY}</p>}
            size="s"
            data-test-subj="pndWatchAdSharedCallout"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <EuiFormRow
        label={sharedWithAttackDiscovery ? i18n.AD_SCHEDULE_LABEL : i18n.SCHEDULE_LABEL}
        helpText={i18n.SCHEDULE_HELP}
        fullWidth
      >
        <EuiSelect
          value={schedule.selectedId}
          options={schedule.optionIds.map((optionId) => ({
            value: optionId,
            text: i18n.SCHEDULE_OPTION_LABELS[optionId] ?? optionId,
          }))}
          onChange={(event) => onScheduleChange(event.target.value)}
          data-test-subj="pndWatchScheduleSelect"
          fullWidth
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label={i18n.MANUAL_RUN_LABEL} helpText={i18n.MANUAL_RUN_HELP} fullWidth>
        <EuiSwitch
          checked={allowManualRun}
          label={i18n.MANUAL_RUN_SWITCH_LABEL}
          onChange={(event) => onManualRunChange(event.target.checked)}
          data-test-subj="pndWatchManualRunSwitch"
        />
      </EuiFormRow>
    </SettingsSection>
  );
};
