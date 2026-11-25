/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GetSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';

interface Props {
  sliRetention: GetSLOGlobalSettingsResponse['sliRetention'];
}

export function GlobalSettingsOverrideCallout({ sliRetention }: Props) {
  const { enabled, periodDays, updatedAt, effective } = sliRetention;

  const appliedValue = i18n.translate('xpack.slo.globalSettings.overrideCallout.appliedValue', {
    defaultMessage:
      'The {setting} setting in kibana.yml overrides these settings. Applied value: {enabled, select, true {enabled} other {disabled}}, {periodDays} days.',
    values: {
      setting: 'xpack.slo.sliRetention',
      enabled: String(effective.enabled),
      periodDays: effective.periodDays,
    },
  });

  const savedValue =
    updatedAt !== null
      ? i18n.translate('xpack.slo.globalSettings.overrideCallout.savedValue', {
          defaultMessage:
            'The saved value ({enabled, select, true {enabled} other {disabled}}, {periodDays} days) applies once the setting is removed from kibana.yml.',
          values: { enabled: String(enabled), periodDays },
        })
      : undefined;

  return (
    <KbnWarningCallout
      data-test-subj="sloGlobalSettingsOverrideCallout"
      title={i18n.translate('xpack.slo.globalSettings.overrideCallout.title', {
        defaultMessage: 'SLI retention is set in kibana.yml',
      })}
      text={savedValue ? `${appliedValue} ${savedValue}` : appliedValue}
    />
  );
}
