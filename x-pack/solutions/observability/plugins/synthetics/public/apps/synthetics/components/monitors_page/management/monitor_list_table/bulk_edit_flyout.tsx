/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EncryptedSyntheticsMonitor,
  EncryptedSyntheticsSavedMonitor,
} from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import { getMonitorSpaceToAppend } from '../../../../hooks';
import type { BulkUpdateMonitorRequest } from '../../../../state';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { isMonitorBulkEditable } from './bulk_edit_eligibility';

export interface SkippedMonitor {
  id: string;
  name: string;
}

export type BulkEditMode = 'add' | 'remove' | 'overwrite';

export const BulkEditModeSelector = ({
  mode,
  onChange,
  legend,
}: {
  mode: BulkEditMode;
  onChange: (mode: BulkEditMode) => void;
  legend: string;
}) => {
  const idPrefix = useGeneratedHtmlId();
  return (
    <EuiButtonGroup
      legend={legend}
      buttonSize="compressed"
      isFullWidth
      idSelected={`${idPrefix}-${mode}`}
      onChange={(id) => onChange(id.replace(`${idPrefix}-`, '') as BulkEditMode)}
      options={[
        {
          id: `${idPrefix}-add`,
          label: ADD_LABEL,
          'data-test-subj': 'syntheticsBulkEditModeAdd',
        },
        {
          id: `${idPrefix}-remove`,
          label: REMOVE_LABEL,
          'data-test-subj': 'syntheticsBulkEditModeRemove',
        },
        {
          id: `${idPrefix}-overwrite`,
          label: OVERWRITE_LABEL,
          'data-test-subj': 'syntheticsBulkEditModeOverwrite',
        },
      ]}
    />
  );
};

const ADD_LABEL = i18n.translate('xpack.synthetics.bulkEditFlyout.mode.add', {
  defaultMessage: 'Add',
});
const REMOVE_LABEL = i18n.translate('xpack.synthetics.bulkEditFlyout.mode.remove', {
  defaultMessage: 'Remove',
});
const OVERWRITE_LABEL = i18n.translate('xpack.synthetics.bulkEditFlyout.mode.overwrite', {
  defaultMessage: 'Overwrite',
});

/**
 * Only `ui`-origin monitors can be patched via the bulk API; project and
 * Terraform-managed monitors are rejected per-id server-side, so we split them
 * out up front and surface them as skipped.
 */
export const partitionEditableMonitors = (
  monitors: EncryptedSyntheticsSavedMonitor[],
  canUsePublicLocations: boolean
): { editableMonitors: EncryptedSyntheticsSavedMonitor[]; skippedMonitors: SkippedMonitor[] } => {
  const editableMonitors: EncryptedSyntheticsSavedMonitor[] = [];
  const skippedMonitors: SkippedMonitor[] = [];
  for (const monitor of monitors) {
    if (isMonitorBulkEditable(monitor, canUsePublicLocations)) {
      editableMonitors.push(monitor);
    } else {
      skippedMonitors.push({ id: monitor[ConfigKey.CONFIG_ID], name: monitor[ConfigKey.NAME] });
    }
  }
  return { editableMonitors, skippedMonitors };
};

interface BulkEditSubmitMessages {
  getSuccessMessage: (count: number) => string;
  getPartialFailureMessage: (updatedCount: number, failedCount: number) => string;
  getFailureMessage: () => string;
  noChangesMessage?: string;
}

/**
 * Builds the per-monitor bulk update payload and drives the API call, toasts
 * and page reload. `buildAttributes` returns `null` for monitors that would be
 * left unchanged (e.g. removing a tag they don't have) so they are skipped.
 */
export const useBulkEditSubmit = ({
  editableMonitors,
  buildAttributes,
  onClose,
  reloadPage,
  messages,
}: {
  editableMonitors: EncryptedSyntheticsSavedMonitor[];
  buildAttributes: (
    monitor: EncryptedSyntheticsSavedMonitor
  ) => Partial<EncryptedSyntheticsMonitor> | null;
  onClose: () => void;
  reloadPage: () => void;
  messages: BulkEditSubmitMessages;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { space } = useKibanaSpace();

  const submit = useCallback(async () => {
    const updatesBySpace = new Map<string | undefined, BulkUpdateMonitorRequest[]>();

    for (const monitor of editableMonitors) {
      const attributes = buildAttributes(monitor);
      if (attributes) {
        const { spaceId: targetSpaceId } = getMonitorSpaceToAppend(
          space,
          monitor[ConfigKey.KIBANA_SPACES]
        );
        const spaceUpdates = updatesBySpace.get(targetSpaceId) ?? [];
        spaceUpdates.push({ id: monitor[ConfigKey.CONFIG_ID], attributes });
        updatesBySpace.set(targetSpaceId, spaceUpdates);
      }
    }

    const totalUpdates = [...updatesBySpace.values()].reduce(
      (count, spaceUpdates) => count + spaceUpdates.length,
      0
    );

    if (totalUpdates === 0) {
      if (messages.noChangesMessage) {
        kibanaService.toasts.addWarning({
          title: messages.noChangesMessage,
          toastLifeTimeMs: 4000,
        });
      }
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const spaceRequests = [...updatesBySpace.entries()].map(([targetSpaceId, spaceUpdates]) => ({
        targetSpaceId,
        spaceUpdates,
      }));
      const settlements = await Promise.allSettled(
        spaceRequests.map(({ targetSpaceId, spaceUpdates }) =>
          fetchBulkUpdateMonitors({ updates: spaceUpdates, spaceId: targetSpaceId })
        )
      );

      let updatedCount = 0;
      let failedCount = 0;
      settlements.forEach((settlement, index) => {
        const { spaceUpdates } = spaceRequests[index];
        if (settlement.status === 'fulfilled') {
          const result = settlement.value.result;
          failedCount += result.filter((entry) => !entry.updated).length;
          updatedCount += result.filter((entry) => entry.updated).length;
        } else {
          failedCount += spaceUpdates.length;
        }
      });

      if (failedCount === 0) {
        kibanaService.toasts.addSuccess({
          title: messages.getSuccessMessage(updatedCount),
          toastLifeTimeMs: 3000,
        });
      } else {
        kibanaService.toasts.addWarning({
          title: messages.getPartialFailureMessage(updatedCount, failedCount),
          toastLifeTimeMs: 5000,
        });
      }
    } catch (e) {
      kibanaService.toasts.addDanger({
        title: messages.getFailureMessage(),
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsSubmitting(false);
      reloadPage();
      onClose();
    }
  }, [editableMonitors, buildAttributes, space, messages, onClose, reloadPage]);

  return { submit, isSubmitting };
};

export const BulkEditFlyout = ({
  title,
  description,
  dataTestSubj,
  submitLabel,
  isSubmitDisabled,
  isSubmitting,
  editableCount,
  skippedMonitors,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  dataTestSubj: string;
  submitLabel: string;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  editableCount: number;
  skippedMonitors: SkippedMonitor[];
  onSubmit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const skippedAccordionId = useGeneratedHtmlId();

  const editableCountLabel = useMemo(
    () =>
      i18n.translate('xpack.synthetics.bulkEditFlyout.editableCount', {
        defaultMessage:
          'Changes will apply to {count, number} selected {count, plural, one {monitor} other {monitors}}.',
        values: { count: editableCount },
      }),
    [editableCount]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      aria-labelledby={flyoutTitleId}
      data-test-subj={dataTestSubj}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {description && (
          <>
            <EuiText size="s" color="subdued">
              <p>{description}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiText size="s">
          <p>{editableCountLabel}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {children}
        {skippedMonitors.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color="warning"
              iconType="warning"
              announceOnMount={false}
              title={i18n.translate('xpack.synthetics.bulkEditFlyout.skippedWarning.title', {
                defaultMessage:
                  '{count, plural, one {# monitor} other {# monitors}} will not be updated',
                values: { count: skippedMonitors.length },
              })}
            >
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.synthetics.bulkEditFlyout.skippedWarning.description', {
                    defaultMessage:
                      'Project and Terraform-managed monitors cannot be edited here (update them from their source instead), and monitors using Elastic managed locations require additional permissions.',
                  })}
                </p>
              </EuiText>
              <EuiAccordion
                id={skippedAccordionId}
                buttonContent={i18n.translate(
                  'xpack.synthetics.bulkEditFlyout.skippedWarning.showIds',
                  { defaultMessage: 'Show skipped monitors' }
                )}
              >
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
              data-test-subj="syntheticsBulkEditFlyoutCancel"
              iconType="cross"
              onClick={onClose}
              flush="left"
            >
              {CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="syntheticsBulkEditFlyoutSubmit"
              fill
              isLoading={isSubmitting}
              disabled={isSubmitDisabled || editableCount === 0}
              onClick={onSubmit}
            >
              {submitLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const CANCEL_LABEL = i18n.translate('xpack.synthetics.bulkEditFlyout.cancel', {
  defaultMessage: 'Cancel',
});
