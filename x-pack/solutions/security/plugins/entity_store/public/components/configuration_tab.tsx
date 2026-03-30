/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  validateDuration,
  validateFrequency,
  validateFilter,
  validateIndexPatterns,
} from '../../common/log_extraction_params';
import type { EngineDescriptor, LogExtractionUpdateParams } from '../types';
import { useUpdateEntityStoreConfig, useForceHistorySnapshot } from '../hooks/use_entity_store_api';
import { useAppServices } from '../services_context';

const UNIT_OPTIONS = [
  {
    value: 's',
    text: i18n.translate('xpack.entityStore.config.seconds', { defaultMessage: 'seconds' }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.entityStore.config.minutes', { defaultMessage: 'minutes' }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.entityStore.config.hours', { defaultMessage: 'hours' }),
  },
  { value: 'd', text: i18n.translate('xpack.entityStore.config.days', { defaultMessage: 'days' }) },
];

const parseDuration = (value: string): { num: number; unit: string } => {
  const match = value.match(/^(\d+)([smdh])$/);
  return match ? { num: parseInt(match[1], 10), unit: match[2] } : { num: 0, unit: 's' };
};

const toDurationString = (num: number, unit: string): string => `${num}${unit}`;

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
}

const DurationInput = ({ value, onChange, min = 1 }: DurationInputProps) => {
  const { num, unit } = useMemo(() => parseDuration(value), [value]);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiFieldNumber
          value={num}
          onChange={(e) => onChange(toDurationString(Math.max(min, Number(e.target.value)), unit))}
          min={min}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 120 }}>
        <EuiSelect
          options={UNIT_OPTIONS}
          value={unit}
          onChange={(e) => onChange(toDurationString(num, e.target.value))}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ConfigurationTabProps {
  engine: EngineDescriptor;
}

export const ConfigurationTab = ({ engine }: ConfigurationTabProps) => {
  const { notifications } = useAppServices();
  const updateConfig = useUpdateEntityStoreConfig();
  const forceHistorySnapshot = useForceHistorySnapshot();

  const [frequency, setFrequency] = useState(engine.frequency);
  const [lookbackPeriod, setLookbackPeriod] = useState(engine.lookbackPeriod);
  const [delay, setDelay] = useState(engine.delay);
  const [fieldHistoryLength, setFieldHistoryLength] = useState(engine.fieldHistoryLength);
  const [filter, setFilter] = useState(engine.filter);
  const [additionalIndexPatterns, setAdditionalIndexPatterns] = useState<EuiComboBoxOptionOption[]>(
    []
  );

  const resetForm = useCallback(() => {
    setFrequency(engine.frequency);
    setLookbackPeriod(engine.lookbackPeriod);
    setDelay(engine.delay);
    setFieldHistoryLength(engine.fieldHistoryLength);
    setFilter(engine.filter);
    setAdditionalIndexPatterns([]);
  }, [engine]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    const params: LogExtractionUpdateParams = {
      frequency,
      lookbackPeriod,
      delay,
      fieldHistoryLength,
      filter,
    };

    if (additionalIndexPatterns.length > 0) {
      params.additionalIndexPatterns = additionalIndexPatterns.map((opt) => opt.label);
    }

    try {
      await updateConfig.mutateAsync(params);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.entityStore.config.saveSuccess', {
          defaultMessage: 'Configuration saved',
        })
      );
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.entityStore.config.saveError', {
          defaultMessage: 'Failed to save configuration',
        })
      );
    }
  }, [
    frequency,
    lookbackPeriod,
    delay,
    fieldHistoryLength,
    filter,
    additionalIndexPatterns,
    updateConfig,
    notifications,
  ]);

  const handleHistorySnapshot = useCallback(async () => {
    try {
      await forceHistorySnapshot.mutateAsync();
      notifications.toasts.addSuccess(
        i18n.translate('xpack.entityStore.config.snapshotTriggered', {
          defaultMessage: 'History snapshot triggered',
        })
      );
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.entityStore.config.snapshotFailed', {
          defaultMessage: 'Failed to trigger history snapshot',
        })
      );
    }
  }, [forceHistorySnapshot, notifications]);

  const hasChanges =
    frequency !== engine.frequency ||
    lookbackPeriod !== engine.lookbackPeriod ||
    delay !== engine.delay ||
    fieldHistoryLength !== engine.fieldHistoryLength ||
    filter !== engine.filter ||
    additionalIndexPatterns.length > 0;

  const frequencyError = validateFrequency(frequency);
  const lookbackError = validateDuration(lookbackPeriod);
  const delayError = validateDuration(delay);
  const filterError = validateFilter(filter);
  const indexPatternsError =
    additionalIndexPatterns.length > 0
      ? validateIndexPatterns(additionalIndexPatterns.map((opt) => opt.label))
      : undefined;
  const hasValidationErrors =
    !!frequencyError || !!lookbackError || !!delayError || !!filterError || !!indexPatternsError;

  return (
    <EuiForm component="form">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.entityStore.config.logExtractionTitle', {
            defaultMessage: 'Log extraction',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.frequencyTitle', {
              defaultMessage: 'Frequency',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.frequencyDescription', {
          defaultMessage: 'How often log extraction runs. Minimum: 30 seconds.',
        })}
      >
        <EuiFormRow isInvalid={!!frequencyError} error={frequencyError}>
          <DurationInput value={frequency} onChange={setFrequency} />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.lookbackTitle', {
              defaultMessage: 'Lookback period',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.lookbackDescription', {
          defaultMessage: 'Time window for each extraction cycle.',
        })}
      >
        <EuiFormRow isInvalid={!!lookbackError} error={lookbackError}>
          <DurationInput value={lookbackPeriod} onChange={setLookbackPeriod} />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.delayTitle', {
              defaultMessage: 'Delay',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.delayDescription', {
          defaultMessage: 'Sync delay before processing.',
        })}
      >
        <EuiFormRow isInvalid={!!delayError} error={delayError}>
          <DurationInput value={delay} onChange={setDelay} />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.fieldHistoryTitle', {
              defaultMessage: 'Field history length',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.fieldHistoryDescription', {
          defaultMessage: 'Number of historical values to retain per field.',
        })}
      >
        <EuiFormRow>
          <EuiFieldNumber
            value={fieldHistoryLength}
            onChange={(e) => setFieldHistoryLength(Number(e.target.value))}
            min={1}
            max={100}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.filterTitle', {
              defaultMessage: 'Filter',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.filterDescription', {
          defaultMessage: 'KQL filter applied to source documents during extraction.',
        })}
      >
        <EuiFormRow isInvalid={!!filterError} error={filterError}>
          <EuiFieldText
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            isInvalid={!!filterError}
            placeholder="e.g. event.category: authentication"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.indexPatternsTitle', {
              defaultMessage: 'Additional index patterns',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.indexPatternsDescription', {
          defaultMessage:
            'Extra indices to include in log extraction beyond the default data view.',
        })}
      >
        <EuiFormRow isInvalid={!!indexPatternsError} error={indexPatternsError}>
          <EuiComboBox
            selectedOptions={additionalIndexPatterns}
            onChange={setAdditionalIndexPatterns}
            isInvalid={!!indexPatternsError}
            onCreateOption={(val) =>
              setAdditionalIndexPatterns((prev) => [...prev, { label: val }])
            }
            placeholder={i18n.translate('xpack.entityStore.config.indexPatternsPlaceholder', {
              defaultMessage: 'Type an index pattern and press Enter',
            })}
            noSuggestions
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiHorizontalRule />

      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.entityStore.config.historySnapshotsTitle', {
            defaultMessage: 'History snapshots',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.entityStore.config.snapshotFrequencyTitle', {
              defaultMessage: 'Snapshot frequency',
            })}
          </h3>
        }
        description={i18n.translate('xpack.entityStore.config.snapshotFrequencyDescription', {
          defaultMessage: 'How often history snapshots are created. Minimum: 1 hour.',
        })}
      >
        <EuiFormRow>
          <DurationInput value="24h" onChange={() => {}} min={1} />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiButton
        onClick={handleHistorySnapshot}
        isLoading={forceHistorySnapshot.isPending}
        iconType="play"
        size="s"
      >
        {i18n.translate('xpack.entityStore.config.runSnapshotNow', {
          defaultMessage: 'Run snapshot now',
        })}
      </EuiButton>

      <EuiHorizontalRule />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={resetForm} disabled={!hasChanges}>
            {i18n.translate('xpack.entityStore.config.discardChanges', {
              defaultMessage: 'Discard changes',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleSave}
            isLoading={updateConfig.isPending}
            iconType="save"
            disabled={!hasChanges || hasValidationErrors}
          >
            {i18n.translate('xpack.entityStore.config.saveConfiguration', {
              defaultMessage: 'Save configuration',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
