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
  /**
   * The signal that drives this watch, when one does — from `PND_SIGNAL_DRIVEN_WATCH_TRIGGERS`.
   *
   * Present means the Frequency select is replaced by the signal-driven explanation. The id itself is
   * not rendered; it is the prop rather than a boolean so the page cannot claim a watch is
   * signal-driven without naming which trigger it believes drives it, which is what
   * `managed_workflow_drift.test.ts` checks against the YAML.
   */
  signalTriggerId?: string;
  onScheduleChange: (scheduleId: string) => void;
  onManualRunChange: (allowManualRun: boolean) => void;
}

/**
 * The Triggers section, as the 2026-08-17 Watch-settings simplification leaves it.
 *
 * ⛔ Two things are deliberately absent. There is no "Shared with Attack Discovery" callout — the same
 * decision removed it, and `WatchTriggersSettings.sharedWithAttackDiscovery` is consequently no longer
 * read by any surface. The field stays on upstream's schema rather than being deleted: it is their mock
 * projection, removing it means regenerating a shared contract and editing their `project_watch`, and
 * the decision retired the callout rather than the data. Bead kibana-phf4.33 left `skills` the same way.
 * And there is no separate "Attack Discovery schedule" label; one Frequency label serves every watch.
 */
export const WatchTriggersSection: React.FC<WatchTriggersSectionProps> = ({
  triggers,
  signalTriggerId,
  onScheduleChange,
  onManualRunChange,
}) => {
  const { schedule, allowManualRun } = triggers;

  return (
    <SettingsSection
      title={i18n.TRIGGERS_SECTION_TITLE}
      subtitle={i18n.TRIGGERS_SECTION_SUBTITLE}
      data-test-subj="pndWatchTriggersSection"
    >
      {signalTriggerId != null ? (
        /*
          A frequency here would be a lie: this watch polls nothing and runs when a producer raises its
          signal. Rendering the select disabled was the alternative and is worse — a greyed dropdown
          reads as "not yet configured" rather than "not how this works".
        */
        <KbnInfoCallout
          announceOnMount
          title={i18n.SIGNAL_DRIVEN_CALLOUT_TITLE}
          text={<p>{i18n.SIGNAL_DRIVEN_CALLOUT_BODY}</p>}
          size="s"
          data-test-subj="pndWatchSignalDrivenCallout"
        />
      ) : (
        <EuiFormRow label={i18n.SCHEDULE_LABEL} helpText={i18n.SCHEDULE_HELP} fullWidth>
          <EuiSelect
            value={schedule.selectedId}
            options={schedule.optionIds.map((optionId) => ({
              value: optionId,
              text: i18n.SCHEDULE_OPTION_LABELS[optionId] ?? optionId,
            }))}
            onChange={(event) => onScheduleChange(event.target.value)}
            aria-label={i18n.SCHEDULE_LABEL}
            data-test-subj="pndWatchScheduleSelect"
            fullWidth
          />
        </EuiFormRow>
      )}

      <EuiSpacer size="m" />

      {/* Manual run survives on both variants: a signal-driven watch can still be started by hand. */}
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
