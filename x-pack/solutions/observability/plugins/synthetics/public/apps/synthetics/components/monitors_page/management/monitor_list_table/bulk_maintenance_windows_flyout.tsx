/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { useGetUrlParams } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { MaintenanceWindowsField } from '../../../monitor_add_edit/fields/maintenance_windows/maintenance_windows';
import { MaintenanceWindowsLink } from '../../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn';
import { useMaintenanceWindows } from '../../../monitor_add_edit/fields/maintenance_windows/use_maintenance_windows';

type BulkMaintenanceWindowsMode = 'apply' | 'remove';

export const BulkMaintenanceWindowsFlyout = ({
  monitors,
  onClose,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  onClose: () => void;
  reloadPage: () => void;
}) => {
  const [mode, setMode] = useState<BulkMaintenanceWindowsMode>('apply');
  const [selectedWindowIds, setSelectedWindowIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { spaceId } = useGetUrlParams();
  const { data: maintenanceWindowsData } = useMaintenanceWindows();
  const flyoutTitleId = useGeneratedHtmlId();
  const skippedAccordionId = useGeneratedHtmlId();

  // Apply and Remove select different things (a window to add vs. a window to
  // detach), so clear the selection when the mode flips to avoid stale ids.
  const handleModeChange = (nextMode: BulkMaintenanceWindowsMode) => {
    setMode(nextMode);
    setSelectedWindowIds([]);
  };

  // Only `ui`-origin monitors can be patched via the bulk API; project/terraform
  // monitors are rejected per-id server-side, so we exclude them up front.
  const { eligibleMonitors, skippedMonitors } = useMemo(() => {
    const eligible: EncryptedSyntheticsSavedMonitor[] = [];
    const skipped: Array<{ id: string; name: string }> = [];
    for (const monitor of monitors) {
      if (monitor[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.UI) {
        eligible.push(monitor);
      } else {
        skipped.push({ id: monitor[ConfigKey.CONFIG_ID], name: monitor[ConfigKey.NAME] });
      }
    }
    return { eligibleMonitors: eligible, skippedMonitors: skipped };
  }, [monitors]);

  // Remove now targets specific windows (like Apply), rather than clearing all,
  // so the options are just the windows currently attached to the selection.
  const windowTitleById = useMemo(() => {
    const map = new Map<string, string>();
    (maintenanceWindowsData?.data ?? []).forEach((mw) => map.set(mw.id, mw.title));
    return map;
  }, [maintenanceWindowsData]);

  const appliedWindowOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const ids = new Set<string>();
    eligibleMonitors.forEach((monitor) => {
      (monitor[ConfigKey.MAINTENANCE_WINDOWS] ?? []).forEach((id) => ids.add(id));
    });
    return Array.from(ids).map((id) => ({ value: id, label: windowTitleById.get(id) ?? id }));
  }, [eligibleMonitors, windowTitleById]);

  // Same rationale as enable/disable: only patch monitors whose resulting set
  // actually differs, so we don't trigger a no-op Fleet re-sync.
  const updates = useMemo(() => {
    return eligibleMonitors.reduce<Array<{ id: string; nextIds: string[] }>>((acc, monitor) => {
      const currentIds = monitor[ConfigKey.MAINTENANCE_WINDOWS] ?? [];
      const nextIds =
        mode === 'apply'
          ? Array.from(new Set([...currentIds, ...selectedWindowIds]))
          : currentIds.filter((id) => !selectedWindowIds.includes(id));
      const changed =
        nextIds.length !== currentIds.length || !nextIds.every((id) => currentIds.includes(id));
      if (changed) {
        acc.push({ id: monitor[ConfigKey.CONFIG_ID], nextIds });
      }
      return acc;
    }, []);
  }, [eligibleMonitors, mode, selectedWindowIds]);

  const handleSave = useCallback(async () => {
    setIsUpdating(true);
    try {
      const { result } = await fetchBulkUpdateMonitors({
        updates: updates.map(({ id, nextIds }) => ({
          id,
          attributes: { [ConfigKey.MAINTENANCE_WINDOWS]: nextIds },
        })),
        spaceId,
      });
      const failedCount = result.filter((entry) => !entry.updated).length;
      const updatedCount = result.length - failedCount;

      if (failedCount === 0) {
        kibanaService.toasts.addSuccess({
          title: getSuccessMessage(mode, updatedCount),
          toastLifeTimeMs: 3000,
        });
      } else {
        kibanaService.toasts.addWarning({
          title: getPartialFailureMessage(mode, updatedCount, failedCount),
          toastLifeTimeMs: 5000,
        });
      }
    } catch (e) {
      kibanaService.toasts.addDanger({
        title: getFailureMessage(mode),
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsUpdating(false);
      reloadPage();
      onClose();
    }
  }, [updates, mode, spaceId, reloadPage, onClose]);

  const modeOptions = [
    { id: 'apply' as const, label: APPLY_LABEL },
    { id: 'remove' as const, label: REMOVE_LABEL },
  ];

  const saveDisabled = updates.length === 0 || selectedWindowIds.length === 0;

  // In Remove mode with nothing attached across the selection, there is simply
  // nothing to remove — surface that plainly instead of an empty combo box.
  const nothingToRemove = mode === 'remove' && appliedWindowOptions.length === 0;

  // Live breakdown of what Save will touch, shown once a window is picked.
  const unchangedCount = eligibleMonitors.length - updates.length;
  const showEffectSummary = selectedWindowIds.length > 0;
  const effectSummary = [
    getWillChangeSummary(updates.length),
    unchangedCount > 0 ? getUnchangedSummary(unchangedCount) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj="syntheticsBulkMaintenanceWindowsFlyout"
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{getDescription(eligibleMonitors.length)}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label={MODE_LABEL} helpText={getModeHelp(mode)}>
          <EuiButtonGroup
            legend={MODE_LABEL}
            options={modeOptions}
            idSelected={mode}
            onChange={(id) => handleModeChange(id as BulkMaintenanceWindowsMode)}
            data-test-subj="syntheticsBulkMaintenanceWindowsModeGroup"
          />
        </EuiFormRow>
        {mode === 'apply' && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow label={SELECT_WINDOWS_LABEL} labelAppend={<MaintenanceWindowsLink />}>
              <MaintenanceWindowsField
                value={selectedWindowIds}
                onChange={setSelectedWindowIds}
                fullWidth
              />
            </EuiFormRow>
          </>
        )}
        {mode === 'remove' && !nothingToRemove && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow label={REMOVE_WINDOWS_LABEL} fullWidth>
              <EuiComboBox<string>
                fullWidth
                placeholder={REMOVE_WINDOWS_PLACEHOLDER}
                aria-label={REMOVE_WINDOWS_PLACEHOLDER}
                options={appliedWindowOptions}
                selectedOptions={appliedWindowOptions.filter((option) =>
                  selectedWindowIds.includes(option.value as string)
                )}
                onChange={(next) =>
                  setSelectedWindowIds(next.map((option) => option.value as string))
                }
                data-test-subj="syntheticsBulkMaintenanceWindowsRemoveComboBox"
              />
            </EuiFormRow>
          </>
        )}
        {nothingToRemove && (
          <>
            <EuiSpacer size="m" />
            <EuiText
              size="s"
              color="subdued"
              data-test-subj="syntheticsBulkMaintenanceWindowsNothingToRemove"
            >
              <p>{NOTHING_TO_REMOVE}</p>
            </EuiText>
          </>
        )}
        {showEffectSummary && (
          <>
            <EuiSpacer size="s" />
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj="syntheticsBulkMaintenanceWindowsEffectSummary"
            >
              {effectSummary}
            </EuiText>
          </>
        )}
        {skippedMonitors.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color="warning"
              iconType="warning"
              announceOnMount={false}
              title={i18n.translate(
                'xpack.synthetics.bulkMaintenanceWindowsFlyout.skippedWarning.title',
                {
                  defaultMessage:
                    '{count, plural, one {# monitor} other {# monitors}} will not be updated',
                  values: { count: skippedMonitors.length },
                }
              )}
            >
              <EuiText size="s">
                <p>{SKIPPED_DESCRIPTION}</p>
              </EuiText>
              <EuiAccordion id={skippedAccordionId} buttonContent={SHOW_SKIPPED_LABEL}>
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  <ul>
                    {skippedMonitors.map(({ id, name }) => (
                      <li key={id}>{name}</li>
                    ))}
                  </ul>
                </EuiText>
              </EuiAccordion>
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="syntheticsBulkMaintenanceWindowsCancel"
            >
              {CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isUpdating}
              disabled={saveDisabled}
              data-test-subj="syntheticsBulkMaintenanceWindowsSave"
            >
              {mode === 'apply' ? APPLY_LABEL : REMOVE_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const getModeHelp = (mode: BulkMaintenanceWindowsMode) =>
  mode === 'apply'
    ? i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.modeHelp.apply', {
        defaultMessage: "Adds the selected maintenance windows to each monitor's existing ones.",
      })
    : i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.modeHelp.remove', {
        defaultMessage: 'Removes the selected maintenance windows from each monitor.',
      });

const getWillChangeSummary = (count: number) =>
  i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.summary.willChange', {
    defaultMessage: '{count, plural, one {# will change} other {# will change}}',
    values: { count },
  });

const getUnchangedSummary = (count: number) =>
  i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.summary.unchanged', {
    defaultMessage: '{count, number} unchanged',
    values: { count },
  });

const getDescription = (count: number) =>
  i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.description', {
    defaultMessage:
      'Apply or remove maintenance windows for {count, number} selected {count, plural, one {monitor} other {monitors}}.',
    values: { count },
  });

const getSuccessMessage = (mode: BulkMaintenanceWindowsMode, count: number) =>
  mode === 'apply'
    ? i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.applySuccess', {
        defaultMessage:
          'Maintenance windows applied to {count, plural, one {# monitor} other {# monitors}}.',
        values: { count },
      })
    : i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.removeSuccess', {
        defaultMessage:
          'Maintenance windows removed from {count, plural, one {# monitor} other {# monitors}}.',
        values: { count },
      });

const getPartialFailureMessage = (
  mode: BulkMaintenanceWindowsMode,
  updatedCount: number,
  failedCount: number
) =>
  mode === 'apply'
    ? i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.applyPartialFailure', {
        defaultMessage:
          '{updatedCount, number} updated, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
        values: { updatedCount, failedCount },
      })
    : i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.removePartialFailure', {
        defaultMessage:
          '{updatedCount, number} updated, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
        values: { updatedCount, failedCount },
      });

const getFailureMessage = (mode: BulkMaintenanceWindowsMode) =>
  mode === 'apply'
    ? i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.applyFailure', {
        defaultMessage: 'Failed to apply maintenance windows. Please try again later.',
      })
    : i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.removeFailure', {
        defaultMessage: 'Failed to remove maintenance windows. Please try again later.',
      });

const FLYOUT_TITLE = i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.title', {
  defaultMessage: 'Manage maintenance windows',
});

const MODE_LABEL = i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.modeLabel', {
  defaultMessage: 'Action',
});

const SELECT_WINDOWS_LABEL = i18n.translate(
  'xpack.synthetics.bulkMaintenanceWindowsFlyout.selectWindowsLabel',
  {
    defaultMessage: 'Maintenance windows',
  }
);

const REMOVE_WINDOWS_LABEL = i18n.translate(
  'xpack.synthetics.bulkMaintenanceWindowsFlyout.removeWindowsLabel',
  {
    defaultMessage: 'Maintenance windows to remove',
  }
);

const REMOVE_WINDOWS_PLACEHOLDER = i18n.translate(
  'xpack.synthetics.bulkMaintenanceWindowsFlyout.removeWindowsPlaceholder',
  {
    defaultMessage: 'Select maintenance windows to remove',
  }
);

const NOTHING_TO_REMOVE = i18n.translate(
  'xpack.synthetics.bulkMaintenanceWindowsFlyout.nothingToRemove',
  {
    defaultMessage: 'None of the selected monitors have maintenance windows to remove.',
  }
);

const SKIPPED_DESCRIPTION = i18n.translate(
  'xpack.synthetics.bulkMaintenanceWindowsFlyout.skippedWarning.description',
  {
    defaultMessage:
      'Project and Terraform-managed monitors cannot be edited here. Update them from their source instead.',
  }
);

const SHOW_SKIPPED_LABEL = i18n.translate(
  'xpack.synthetics.bulkMaintenanceWindowsFlyout.skippedWarning.showIds',
  { defaultMessage: 'Show skipped monitors' }
);

const CANCEL_LABEL = i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.cancel', {
  defaultMessage: 'Cancel',
});

const APPLY_LABEL = i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.apply', {
  defaultMessage: 'Apply',
});

const REMOVE_LABEL = i18n.translate('xpack.synthetics.bulkMaintenanceWindowsFlyout.remove', {
  defaultMessage: 'Remove',
});
