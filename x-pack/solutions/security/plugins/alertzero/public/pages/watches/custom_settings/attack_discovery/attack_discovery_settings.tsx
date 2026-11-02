/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextArea } from '@elastic/eui';
import {
  ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH,
  AttackDiscoveryWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { SettingRow } from '../../components/setting_row';
import * as i18n from './translations';
import type { WorkerCustomSettingsComponent } from '../types';

const readAttackDiscoveryExtras = (settings: WorkerSettings): AttackDiscoveryWorkerExtras => {
  const parsed = AttackDiscoveryWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : {};
};

export const AttackDiscoverySettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const { additionalContext } = readAttackDiscoveryExtras(settings);

  return (
    <SettingRow
      label={i18n.ADDITIONAL_CONTEXT_LABEL}
      labelHelp={i18n.ADDITIONAL_CONTEXT_HELP}
      data-test-subj="alertZeroAdditionalContextRow"
    >
      <EuiTextArea
        fullWidth
        rows={5}
        maxLength={ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH}
        value={additionalContext ?? ''}
        aria-label={i18n.ADDITIONAL_CONTEXT_ARIA_LABEL}
        data-test-subj="alertZeroAdditionalContext"
        disabled={isDisabled}
        // The setting is optional and cannot be empty, so clearing the box removes the key
        // rather than saving an empty string.
        onChange={({ target: { value } }) =>
          onExtrasChange(value.trim() === '' ? {} : { additionalContext: value })
        }
      />
    </SettingRow>
  );
};
