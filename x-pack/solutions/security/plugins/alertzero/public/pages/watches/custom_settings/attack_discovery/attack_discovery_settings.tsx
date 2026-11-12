/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiFormErrorText, EuiTextArea } from '@elastic/eui';
import {
  ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH,
  AdditionalContext,
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
  onValidityChange,
  resetKey,
}) => {
  const { additionalContext } = readAttackDiscoveryExtras(settings);
  // The raw text lives here while editing: whitespace and a rejected value never reach the draft,
  // so the textarea cannot be driven from `settings` alone.
  const [text, setText] = useState<string | null>(null);
  const value = text ?? additionalContext ?? '';
  const isBlank = value.trim() === '';
  const isInvalid = !isBlank && !AdditionalContext.safeParse(value).success;

  useEffect(() => {
    onValidityChange?.(!isInvalid);
  }, [isInvalid, onValidityChange]);

  // Discard drops a flagged value; skipped on mount so it does not fight the stored value.
  const isFirstResetRef = useRef(true);
  useEffect(() => {
    if (isFirstResetRef.current) {
      isFirstResetRef.current = false;
      return;
    }
    setText(null);
  }, [resetKey]);

  // A control that unmounts while flagged must not leave the page's Save blocked.
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  useEffect(() => () => onValidityChangeRef.current?.(true), []);

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
        value={value}
        isInvalid={isInvalid}
        aria-label={i18n.ADDITIONAL_CONTEXT_ARIA_LABEL}
        data-test-subj="alertZeroAdditionalContext"
        disabled={isDisabled}
        onChange={({ target }) => {
          const next = target.value;
          setText(next);
          if (next.trim() === '') {
            // The setting is optional and cannot be empty, so clearing the box removes the key
            // rather than saving an empty string.
            onExtrasChange({});
          } else if (AdditionalContext.safeParse(next).success) {
            onExtrasChange({ additionalContext: next });
          }
        }}
        onBlur={() => {
          if (!isInvalid) setText(null);
        }}
      />
      {isInvalid && (
        <EuiFormErrorText data-test-subj="alertZeroAdditionalContextError">
          {i18n.ADDITIONAL_CONTEXT_TEMPLATE_SYNTAX_ERROR}
        </EuiFormErrorText>
      )}
    </SettingRow>
  );
};
