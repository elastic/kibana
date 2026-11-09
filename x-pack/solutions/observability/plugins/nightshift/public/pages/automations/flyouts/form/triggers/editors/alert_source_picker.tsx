/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiComboBox, EuiPanel, EuiSpacer } from '@elastic/eui';
import {
  CLASSIC_ALERT_SOURCE,
  EXTERNAL_ALERT_SOURCE,
  UNIVERSAL_ALERT_SOURCE,
} from '@kbn/nightshift-investigations-plugin/common';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type { TriggerFormValues } from '../../automation_form_values';
import { alertSourceLabels } from '../translations';

type AlertTrigger = Extract<TriggerFormValues, { kind: 'alert' }>;

const KNOWN_SOURCES = [
  { key: CLASSIC_ALERT_SOURCE, label: alertSourceLabels.classic },
  { key: UNIVERSAL_ALERT_SOURCE, label: alertSourceLabels.universalRules },
  { key: SIGNIFICANT_EVENTS_ALERT_SOURCE, label: alertSourceLabels.significantEvents },
  { key: EXTERNAL_ALERT_SOURCE, label: alertSourceLabels.external },
];

const sourceLabel = (source: string) =>
  KNOWN_SOURCES.find(({ key }) => key === source)?.label ?? source;

export const alertSourcePillLabel = ({ alertSources, alertSourceMode }: AlertTrigger) => {
  if (alertSources.length === 0) return alertSourceLabels.anySource;
  const names = alertSources.map(sourceLabel).join(', ');
  return alertSourceMode === 'exclude' ? `${alertSourceLabels.exclude}: ${names}` : names;
};

const MODE_OPTIONS = [
  { id: 'include', label: alertSourceLabels.include },
  { id: 'exclude', label: alertSourceLabels.exclude },
];

export const AlertSourcePicker = ({
  trigger,
  onChange,
}: {
  trigger: AlertTrigger;
  onChange: (trigger: TriggerFormValues) => void;
}) => (
  <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 340 }}>
    <EuiButtonGroup
      isFullWidth
      buttonSize="compressed"
      legend={alertSourceLabels.title}
      options={MODE_OPTIONS}
      idSelected={trigger.alertSourceMode}
      onChange={(id) =>
        onChange({ ...trigger, alertSourceMode: id === 'exclude' ? 'exclude' : 'include' })
      }
      data-test-subj="automationAlertSourceMode"
    />
    <EuiSpacer size="s" />
    <EuiComboBox
      compressed
      aria-label={alertSourceLabels.title}
      placeholder={alertSourceLabels.title}
      options={KNOWN_SOURCES}
      selectedOptions={trigger.alertSources.map((source) => ({
        key: source,
        label: sourceLabel(source),
      }))}
      onCreateOption={(value) => {
        const source = value.trim();
        if (!source) return;
        onChange({ ...trigger, alertSources: [...new Set([...trigger.alertSources, source])] });
      }}
      onChange={(options) =>
        onChange({ ...trigger, alertSources: options.map(({ key, label }) => key ?? label) })
      }
      data-test-subj="automationAlertSourcesInput"
    />
  </EuiPanel>
);
