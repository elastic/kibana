/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { fetchFieldSuggestions } from '../../../../state';
import { useCanUsePublicLocationsPermission } from '../../../../../../hooks/use_capabilities';
import type { BulkEditMode } from './bulk_edit_flyout';
import {
  BulkEditFlyout,
  BulkEditModeSelector,
  partitionEditableMonitors,
  useBulkEditSubmit,
} from './bulk_edit_flyout';

interface LabelPair {
  id: string;
  key: string;
  value: string;
}
type Labels = Record<string, string>;

const recordsEqual = (a: Labels, b: Labels) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => a[key] === b[key]);
};

const pairsToRecord = (pairs: LabelPair[]): Labels => {
  const record: Labels = {};
  for (const { key, value } of pairs) {
    const trimmedKey = key.trim();
    if (trimmedKey) {
      record[trimmedKey] = value;
    }
  }
  return record;
};

export const BulkLabelsFlyout = ({
  monitors,
  onClose,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  onClose: () => void;
  reloadPage: () => void;
}) => {
  const canUsePublicLocations = useCanUsePublicLocationsPermission();
  const pairIdRef = useRef(0);
  const createEmptyPair = useCallback((): LabelPair => {
    pairIdRef.current += 1;
    return { id: String(pairIdRef.current), key: '', value: '' };
  }, []);

  const [mode, setMode] = useState<BulkEditMode>('add');
  const [pairs, setPairs] = useState<LabelPair[]>(() => {
    pairIdRef.current += 1;
    return [{ id: String(pairIdRef.current), key: '', value: '' }];
  });
  const [removeKeys, setRemoveKeys] = useState<string[]>([]);

  const { editableMonitors, skippedMonitors } = useMemo(
    () => partitionEditableMonitors(monitors, canUsePublicLocations),
    [monitors, canUsePublicLocations]
  );

  const { data: suggestions } = useFetcher(() => fetchFieldSuggestions(), []);

  const labelKeyOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => (suggestions?.labelKeys ?? []).map((key) => ({ label: key })),
    [suggestions]
  );

  const hasValidPairs = useMemo(() => Object.keys(pairsToRecord(pairs)).length > 0, [pairs]);

  const buildAttributes = useCallback(
    (monitor: EncryptedSyntheticsSavedMonitor) => {
      const current = (monitor[ConfigKey.LABELS] as Labels | undefined) ?? {};
      let next: Labels;
      switch (mode) {
        case 'add':
          next = { ...current, ...pairsToRecord(pairs) };
          break;
        case 'remove':
          next = Object.fromEntries(
            Object.entries(current).filter(([key]) => !removeKeys.includes(key))
          );
          break;
        case 'overwrite':
        default:
          next = pairsToRecord(pairs);
          break;
      }
      if (recordsEqual(current, next)) {
        return null;
      }
      return { [ConfigKey.LABELS]: next };
    },
    [mode, pairs, removeKeys]
  );

  const { submit, isSubmitting } = useBulkEditSubmit({
    editableMonitors,
    buildAttributes,
    onClose,
    reloadPage,
    messages: {
      getSuccessMessage: (count) =>
        i18n.translate('xpack.synthetics.bulkLabelsFlyout.success', {
          defaultMessage: 'Labels updated for {count, plural, one {# monitor} other {# monitors}}.',
          values: { count },
        }),
      getPartialFailureMessage: (updatedCount, failedCount) =>
        i18n.translate('xpack.synthetics.bulkLabelsFlyout.partialFailure', {
          defaultMessage:
            '{updatedCount, number} updated, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
          values: { updatedCount, failedCount },
        }),
      getFailureMessage: () =>
        i18n.translate('xpack.synthetics.bulkLabelsFlyout.failure', {
          defaultMessage: 'Failed to update labels. Please try again later.',
        }),
      noChangesMessage: i18n.translate('xpack.synthetics.bulkLabelsFlyout.noChanges', {
        defaultMessage: 'The selected monitors already match the requested labels.',
      }),
    },
  });

  const isSubmitDisabled = mode === 'remove' ? removeKeys.length === 0 : !hasValidPairs;

  const updatePair = (index: number, field: keyof LabelPair, value: string) => {
    setPairs((prev) => prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)));
  };

  const removePairRow = (index: number) => {
    setPairs((prev) =>
      prev.length === 1 ? [createEmptyPair()] : prev.filter((_, i) => i !== index)
    );
  };

  return (
    <BulkEditFlyout
      title={TITLE}
      dataTestSubj="syntheticsBulkLabelsFlyout"
      submitLabel={APPLY_LABEL}
      isSubmitDisabled={isSubmitDisabled}
      isSubmitting={isSubmitting}
      editableCount={editableMonitors.length}
      skippedMonitors={skippedMonitors}
      onSubmit={submit}
      onClose={onClose}
    >
      <EuiFormRow label={MODE_LABEL} fullWidth>
        <BulkEditModeSelector mode={mode} onChange={setMode} legend={MODE_LABEL} />
      </EuiFormRow>
      <EuiSpacer size="m" />
      {mode === 'remove' ? (
        <EuiFormRow label={REMOVE_KEYS_LABEL} fullWidth helpText={REMOVE_HELP}>
          <EuiComboBox
            fullWidth
            data-test-subj="syntheticsBulkLabelsRemoveComboBox"
            aria-label={REMOVE_KEYS_LABEL}
            options={labelKeyOptions}
            selectedOptions={removeKeys.map((key) => ({ label: key }))}
            onChange={(selected) => setRemoveKeys(selected.map(({ label }) => label))}
            onCreateOption={(value) => {
              const trimmed = value.trim();
              if (trimmed) {
                setRemoveKeys((prev) => Array.from(new Set([...prev, trimmed])));
              }
            }}
            isClearable
          />
        </EuiFormRow>
      ) : (
        <EuiFormRow
          label={PAIRS_LABEL}
          fullWidth
          helpText={mode === 'add' ? ADD_HELP : OVERWRITE_HELP}
        >
          <div>
            {pairs.map((pair, index) => (
              <React.Fragment key={pair.id}>
                {index > 0 && <EuiSpacer size="xs" />}
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem>
                    <EuiComboBox
                      fullWidth
                      singleSelection={{ asPlainText: true }}
                      data-test-subj={`syntheticsBulkLabelsKeyComboBox-${index}`}
                      aria-label={KEY_PLACEHOLDER}
                      placeholder={KEY_PLACEHOLDER}
                      options={labelKeyOptions}
                      selectedOptions={pair.key ? [{ label: pair.key }] : []}
                      onChange={(selected) => updatePair(index, 'key', selected[0]?.label ?? '')}
                      onCreateOption={(value) => updatePair(index, 'key', value.trim())}
                      isClearable
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFieldText
                      fullWidth
                      data-test-subj={`syntheticsBulkLabelsValueField-${index}`}
                      aria-label={VALUE_PLACEHOLDER}
                      placeholder={VALUE_PLACEHOLDER}
                      value={pair.value}
                      onChange={(e) => updatePair(index, 'value', e.target.value)}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={REMOVE_ROW_LABEL} disableScreenReaderOutput>
                      <EuiButtonIcon
                        data-test-subj={`syntheticsBulkLabelsRemoveRow-${index}`}
                        iconType="trash"
                        color="danger"
                        aria-label={REMOVE_ROW_LABEL}
                        onClick={() => removePairRow(index)}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </React.Fragment>
            ))}
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              data-test-subj="syntheticsBulkLabelsAddRow"
              iconType="plusInCircle"
              size="s"
              flush="left"
              onClick={() => setPairs((prev) => [...prev, createEmptyPair()])}
            >
              {ADD_ROW_LABEL}
            </EuiButtonEmpty>
          </div>
        </EuiFormRow>
      )}
    </BulkEditFlyout>
  );
};

const TITLE = i18n.translate('xpack.synthetics.bulkLabelsFlyout.title', {
  defaultMessage: 'Edit labels',
});
const MODE_LABEL = i18n.translate('xpack.synthetics.bulkLabelsFlyout.modeLabel', {
  defaultMessage: 'Action',
});
const PAIRS_LABEL = i18n.translate('xpack.synthetics.bulkLabelsFlyout.pairsLabel', {
  defaultMessage: 'Labels',
});
const REMOVE_KEYS_LABEL = i18n.translate('xpack.synthetics.bulkLabelsFlyout.removeKeysLabel', {
  defaultMessage: 'Label keys to remove',
});
const KEY_PLACEHOLDER = i18n.translate('xpack.synthetics.bulkLabelsFlyout.keyPlaceholder', {
  defaultMessage: 'Key',
});
const VALUE_PLACEHOLDER = i18n.translate('xpack.synthetics.bulkLabelsFlyout.valuePlaceholder', {
  defaultMessage: 'Value',
});
const ADD_ROW_LABEL = i18n.translate('xpack.synthetics.bulkLabelsFlyout.addRow', {
  defaultMessage: 'Add label',
});
const REMOVE_ROW_LABEL = i18n.translate('xpack.synthetics.bulkLabelsFlyout.removeRow', {
  defaultMessage: 'Remove label',
});
const ADD_HELP = i18n.translate('xpack.synthetics.bulkLabelsFlyout.addHelp', {
  defaultMessage:
    'These labels will be added to the selected monitors. Existing keys are overwritten.',
});
const OVERWRITE_HELP = i18n.translate('xpack.synthetics.bulkLabelsFlyout.overwriteHelp', {
  defaultMessage: 'The labels on the selected monitors will be replaced with these labels.',
});
const REMOVE_HELP = i18n.translate('xpack.synthetics.bulkLabelsFlyout.removeHelp', {
  defaultMessage: 'Labels with these keys will be removed from the selected monitors.',
});
const APPLY_LABEL = i18n.translate('xpack.synthetics.bulkLabelsFlyout.apply', {
  defaultMessage: 'Apply changes',
});
