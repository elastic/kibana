/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { fetchTagSuggestions } from '../../../../state';
import { useCanUsePublicLocationsPermission } from '../../../../../../hooks/use_capabilities';
import type { BulkEditMode } from './bulk_edit_flyout';
import {
  BulkEditFlyout,
  BulkEditModeSelector,
  partitionEditableMonitors,
  useBulkEditSubmit,
} from './bulk_edit_flyout';

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((val, index) => val === b[index]);

const uniqueSorted = (values: string[]) => Array.from(new Set(values)).sort();

export const BulkTagsFlyout = ({
  monitors,
  onClose,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  onClose: () => void;
  reloadPage: () => void;
}) => {
  const [mode, setMode] = useState<BulkEditMode>('add');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const canUsePublicLocations = useCanUsePublicLocationsPermission();

  const { editableMonitors, skippedMonitors } = useMemo(
    () => partitionEditableMonitors(monitors, canUsePublicLocations),
    [monitors, canUsePublicLocations]
  );

  const { data: suggestions } = useFetcher(() => fetchTagSuggestions(), []);

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => (suggestions ?? []).map((tag) => ({ label: tag })),
    [suggestions]
  );

  const buildAttributes = useCallback(
    (monitor: EncryptedSyntheticsSavedMonitor) => {
      const current = (monitor[ConfigKey.TAGS] as string[] | undefined) ?? [];
      let next: string[];
      switch (mode) {
        case 'add':
          next = uniqueSorted([...current, ...selectedTags]);
          break;
        case 'remove':
          next = uniqueSorted(current.filter((tag) => !selectedTags.includes(tag)));
          break;
        case 'overwrite':
        default:
          next = uniqueSorted(selectedTags);
          break;
      }
      // Skip monitors whose tags would be unchanged so they aren't re-synced.
      if (arraysEqual(uniqueSorted(current), uniqueSorted(next))) {
        return null;
      }
      return { [ConfigKey.TAGS]: next };
    },
    [mode, selectedTags]
  );

  const { submit, isSubmitting } = useBulkEditSubmit({
    editableMonitors,
    buildAttributes,
    onClose,
    reloadPage,
    messages: {
      getSuccessMessage: (count) =>
        i18n.translate('xpack.synthetics.bulkTagsFlyout.success', {
          defaultMessage: 'Tags updated for {count, plural, one {# monitor} other {# monitors}}.',
          values: { count },
        }),
      getPartialFailureMessage: (updatedCount, failedCount) =>
        i18n.translate('xpack.synthetics.bulkTagsFlyout.partialFailure', {
          defaultMessage:
            '{updatedCount, number} updated, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
          values: { updatedCount, failedCount },
        }),
      getFailureMessage: () =>
        i18n.translate('xpack.synthetics.bulkTagsFlyout.failure', {
          defaultMessage: 'Failed to update tags. Please try again later.',
        }),
      noChangesMessage: i18n.translate('xpack.synthetics.bulkTagsFlyout.noChanges', {
        defaultMessage: 'The selected monitors already match the requested tags.',
      }),
    },
  });

  return (
    <BulkEditFlyout
      title={TITLE}
      dataTestSubj="syntheticsBulkTagsFlyout"
      submitLabel={APPLY_LABEL}
      isSubmitDisabled={selectedTags.length === 0}
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
      <EuiFormRow label={TAGS_LABEL} fullWidth helpText={getModeHelpText(mode)}>
        <EuiComboBox
          fullWidth
          data-test-subj="syntheticsBulkTagsComboBox"
          aria-label={TAGS_LABEL}
          options={options}
          selectedOptions={selectedTags.map((tag) => ({ label: tag }))}
          onChange={(selected) => setSelectedTags(selected.map(({ label }) => label))}
          onCreateOption={(value) => {
            const trimmed = value.trim();
            if (trimmed) {
              setSelectedTags((prev) => uniqueSorted([...prev, trimmed]));
            }
          }}
          isClearable
        />
      </EuiFormRow>
    </BulkEditFlyout>
  );
};

const getModeHelpText = (mode: BulkEditMode) => {
  switch (mode) {
    case 'add':
      return i18n.translate('xpack.synthetics.bulkTagsFlyout.addHelp', {
        defaultMessage: 'These tags will be added to the selected monitors.',
      });
    case 'remove':
      return i18n.translate('xpack.synthetics.bulkTagsFlyout.removeHelp', {
        defaultMessage: 'These tags will be removed from the selected monitors.',
      });
    case 'overwrite':
    default:
      return i18n.translate('xpack.synthetics.bulkTagsFlyout.overwriteHelp', {
        defaultMessage: 'The tags on the selected monitors will be replaced with these tags.',
      });
  }
};

const TITLE = i18n.translate('xpack.synthetics.bulkTagsFlyout.title', {
  defaultMessage: 'Edit tags',
});
const MODE_LABEL = i18n.translate('xpack.synthetics.bulkTagsFlyout.modeLabel', {
  defaultMessage: 'Action',
});
const TAGS_LABEL = i18n.translate('xpack.synthetics.bulkTagsFlyout.tagsLabel', {
  defaultMessage: 'Tags',
});
const APPLY_LABEL = i18n.translate('xpack.synthetics.bulkTagsFlyout.apply', {
  defaultMessage: 'Apply changes',
});
