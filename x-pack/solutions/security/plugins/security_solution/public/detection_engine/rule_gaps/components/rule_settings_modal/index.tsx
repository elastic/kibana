/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiFieldNumber,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { validateDurationSchema } from '@kbn/alerting-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  useGetGapAutoFillScheduler,
  useCreateGapAutoFillScheduler,
  useUpdateGapAutoFillScheduler,
} from '../../api/hooks/use_gap_auto_fill_scheduler';
import * as i18n from '../../translations';

const SCHEDULE_UNITS = [
  { value: 's', text: i18n.SCHEDULE_UNIT_SECONDS },
  { value: 'm', text: i18n.SCHEDULE_UNIT_MINUTES },
  { value: 'h', text: i18n.SCHEDULE_UNIT_HOURS },
  { value: 'd', text: i18n.SCHEDULE_UNIT_DAYS },
];

export interface RuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleSettingsModal: React.FC<RuleSettingsModalProps> = ({ isOpen, onClose }) => {
  const query = useGetGapAutoFillScheduler();
  const createMutation = useCreateGapAutoFillScheduler();
  const updateMutation = useUpdateGapAutoFillScheduler();
  const { addSuccess, addError } = useAppToasts();

  const [enabled, setEnabled] = useState<boolean>(false);
  const [intervalNumber, setIntervalNumber] = useState<number>(5);
  const [intervalUnit, setIntervalUnit] = useState<'s' | 'm' | 'h' | 'd'>('m');
  const [intervalError, setIntervalError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen && query.data) {
      const isEnabled = query.data?.enabled ?? false;
      const interval = query.data?.schedule?.interval ?? '1h';
      setEnabled(isEnabled);
      // parse like "5m", "1h"
      const match = /^(\d+)([smhd])$/.exec(interval);
      if (match) {
        const [, num, unit] = match;
        setIntervalNumber(Math.max(1, parseInt(num, 10)));
        setIntervalUnit(unit as 's' | 'm' | 'h' | 'd');
      } else {
        setIntervalNumber(5);
        setIntervalUnit('s');
      }
    }
  }, [isOpen, query.data]);

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  const intervalString = useMemo(
    () => `${intervalNumber}${intervalUnit}`,
    [intervalNumber, intervalUnit]
  );

  const onSave = async () => {
    // validate interval before saving
    const validationError = validateDurationSchema(intervalString);
    if (validationError) {
      setIntervalError(validationError);
      return;
    }
    setIntervalError(undefined);
    try {
      const status = (query.error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        await createMutation.mutateAsync({ enabled, schedule: { interval: intervalString } });
      } else {
        await updateMutation.mutateAsync({ enabled, schedule: { interval: intervalString } });
      }
      addSuccess({
        title: i18n.SAVE,
        text: i18n.AUTO_GAP_FILL_HEADER,
      });
    } catch (err) {
      addError(err, { title: i18n.SAVE });
    }
  };

  if (!isOpen) return null;

  return (
    <EuiModal style={{ width: 600 }} onClose={onClose} aria-labelledby={i18n.RULE_SETTINGS_TITLE}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.RULE_SETTINGS_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>{i18n.AUTO_GAP_FILL_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFormRow>
          <EuiSwitch
            data-test-subj="rule-settings-enable-switch"
            label={i18n.AUTO_GAP_FILL_TOGGLE_LABEL}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={isSaving}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>{i18n.AUTO_GAP_FILL_DESCRIPTION}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.RUN_SCHEDULE_LABEL}
          isInvalid={!!intervalError}
          error={intervalError}
        >
          <EuiFlexGroup style={{ maxWidth: 250 }}>
            <EuiFlexItem grow={2}>
              <EuiFieldNumber
                data-test-subj="rule-settings-schedule-number"
                min={1}
                value={intervalNumber}
                isInvalid={!!intervalError}
                disabled={isSaving}
                onChange={(e) => {
                  const raw = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                  if (Number.isNaN(raw)) return;
                  const clamped = Math.max(1, raw);
                  setIntervalNumber(clamped);
                  setIntervalError(undefined);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={4}>
              <EuiSelect
                data-test-subj="rule-settings-schedule-unit"
                options={SCHEDULE_UNITS}
                value={intervalUnit}
                disabled={isSaving}
                onChange={(e) => {
                  setIntervalUnit(e.target.value as 's' | 'm' | 'h' | 'd');
                  setIntervalError(undefined);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL}</EuiButtonEmpty>
        <EuiButton onClick={onSave} fill isLoading={isSaving} data-test-subj="rule-settings-save">
          {i18n.SAVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
