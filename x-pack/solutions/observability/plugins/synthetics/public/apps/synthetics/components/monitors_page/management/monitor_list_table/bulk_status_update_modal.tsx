/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiConfirmModal,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { useGetUrlParams } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';

export const BulkStatusUpdateModal = ({
  monitors,
  enabled,
  onClose,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  enabled: boolean;
  onClose: () => void;
  reloadPage: () => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { spaceId } = useGetUrlParams();
  const modalTitleId = useGeneratedHtmlId();
  const skippedAccordionId = useGeneratedHtmlId();

  // Only `ui`-origin monitors can be patched via the bulk API; project/terraform
  // monitors are rejected per-id server-side, so we exclude them up front.
  const { eligibleIds, skippedMonitors } = useMemo(() => {
    const eligible: string[] = [];
    const skipped: Array<{ id: string; name: string }> = [];
    for (const monitor of monitors) {
      const id = monitor[ConfigKey.CONFIG_ID];
      if (monitor[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.UI) {
        eligible.push(id);
      } else {
        skipped.push({ id, name: monitor[ConfigKey.NAME] });
      }
    }
    return { eligibleIds: eligible, skippedMonitors: skipped };
  }, [monitors]);

  const handleConfirm = useCallback(async () => {
    setIsUpdating(true);
    try {
      const { result } = await fetchBulkUpdateMonitors({
        updates: eligibleIds.map((id) => ({
          id,
          attributes: { [ConfigKey.ENABLED]: enabled },
        })),
        spaceId,
      });
      const failedCount = result.filter((entry) => !entry.updated).length;
      const updatedCount = result.length - failedCount;

      if (failedCount === 0) {
        kibanaService.toasts.addSuccess({
          title: getSuccessMessage(enabled, updatedCount),
          toastLifeTimeMs: 3000,
        });
      } else {
        kibanaService.toasts.addWarning({
          title: getPartialFailureMessage(enabled, updatedCount, failedCount),
          toastLifeTimeMs: 5000,
        });
      }
    } catch (e) {
      kibanaService.toasts.addDanger({
        title: getFailureMessage(enabled),
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsUpdating(false);
      reloadPage();
      onClose();
    }
  }, [eligibleIds, enabled, spaceId, reloadPage, onClose]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={getTitle(enabled, eligibleIds.length)}
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={handleConfirm}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={enabled ? ENABLE_LABEL : DISABLE_LABEL}
      confirmButtonDisabled={eligibleIds.length === 0}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      isLoading={isUpdating}
    >
      <EuiText size="s">
        <p>{getDescription(enabled, eligibleIds.length)}</p>
      </EuiText>
      {skippedMonitors.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            color="warning"
            iconType="warning"
            announceOnMount={false}
            title={i18n.translate('xpack.synthetics.bulkStatusUpdateModal.skippedWarning.title', {
              defaultMessage:
                '{count, plural, one {# monitor} other {# monitors}} will not be updated',
              values: { count: skippedMonitors.length },
            })}
          >
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.synthetics.bulkStatusUpdateModal.skippedWarning.description',
                  {
                    defaultMessage:
                      'Project and Terraform-managed monitors cannot be edited here. Update them from their source instead.',
                  }
                )}
              </p>
            </EuiText>
            <EuiAccordion
              id={skippedAccordionId}
              buttonContent={i18n.translate(
                'xpack.synthetics.bulkStatusUpdateModal.skippedWarning.showIds',
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
    </EuiConfirmModal>
  );
};

const getTitle = (enabled: boolean, count: number) =>
  enabled
    ? i18n.translate('xpack.synthetics.bulkStatusUpdateModal.enableTitle', {
        defaultMessage: 'Enable {count, number} {count, plural, one {monitor} other {monitors}}?',
        values: { count },
      })
    : i18n.translate('xpack.synthetics.bulkStatusUpdateModal.disableTitle', {
        defaultMessage: 'Disable {count, number} {count, plural, one {monitor} other {monitors}}?',
        values: { count },
      });

const getDescription = (enabled: boolean, count: number) =>
  enabled
    ? i18n.translate('xpack.synthetics.bulkStatusUpdateModal.enableDescription', {
        defaultMessage:
          'This will enable {count, number} {count, plural, one {monitor} other {monitors}} and they will resume running on their schedule.',
        values: { count },
      })
    : i18n.translate('xpack.synthetics.bulkStatusUpdateModal.disableDescription', {
        defaultMessage:
          'This will disable {count, number} {count, plural, one {monitor} other {monitors}} and they will stop running until re-enabled.',
        values: { count },
      });

const getSuccessMessage = (enabled: boolean, count: number) =>
  enabled
    ? i18n.translate('xpack.synthetics.bulkStatusUpdateModal.enableSuccess', {
        defaultMessage:
          '{count, plural, one {# monitor} other {# monitors}} enabled successfully.',
        values: { count },
      })
    : i18n.translate('xpack.synthetics.bulkStatusUpdateModal.disableSuccess', {
        defaultMessage:
          '{count, plural, one {# monitor} other {# monitors}} disabled successfully.',
        values: { count },
      });

const getPartialFailureMessage = (enabled: boolean, updatedCount: number, failedCount: number) =>
  enabled
    ? i18n.translate('xpack.synthetics.bulkStatusUpdateModal.enablePartialFailure', {
        defaultMessage:
          '{updatedCount, number} enabled, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
        values: { updatedCount, failedCount },
      })
    : i18n.translate('xpack.synthetics.bulkStatusUpdateModal.disablePartialFailure', {
        defaultMessage:
          '{updatedCount, number} disabled, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
        values: { updatedCount, failedCount },
      });

const getFailureMessage = (enabled: boolean) =>
  enabled
    ? i18n.translate('xpack.synthetics.bulkStatusUpdateModal.enableFailure', {
        defaultMessage: 'Failed to enable monitors. Please try again later.',
      })
    : i18n.translate('xpack.synthetics.bulkStatusUpdateModal.disableFailure', {
        defaultMessage: 'Failed to disable monitors. Please try again later.',
      });

const CANCEL_LABEL = i18n.translate('xpack.synthetics.bulkStatusUpdateModal.cancel', {
  defaultMessage: 'Cancel',
});

const ENABLE_LABEL = i18n.translate('xpack.synthetics.bulkStatusUpdateModal.enable', {
  defaultMessage: 'Enable',
});

const DISABLE_LABEL = i18n.translate('xpack.synthetics.bulkStatusUpdateModal.disable', {
  defaultMessage: 'Disable',
});
