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
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { useCanUsePublicLocationsPermission } from '../../../../../../hooks/use_capabilities';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import { getMonitorSpaceToAppend } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { isMonitorBulkEditable } from './bulk_edit_eligibility';

export const BulkStatusUpdateModal = ({
  monitors,
  enabled,
  onClose,
  onCompleted,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  enabled: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  reloadPage: () => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { space } = useKibanaSpace();
  const canUsePublicLocations = useCanUsePublicLocationsPermission();
  const modalTitleId = useGeneratedHtmlId();
  const skippedAccordionId = useGeneratedHtmlId();

  // Only monitors that can actually be patched are sent to the bulk API:
  // project/terraform monitors are rejected server-side, and public-location
  // monitors require the elastic-managed-locations capability. Ineligible
  // monitors are surfaced as skipped so the user understands why.
  //
  // Monitors are multi-space saved objects and the bulk API resolves ids within
  // a single space, so a monitor only visible via "show from all spaces" must be
  // updated in a space it belongs to. Group eligible ids by their target space
  // (reusing the cross-space edit-link logic) and issue one request per space;
  // an `undefined` target resolves to the current space.
  const { updatesBySpace, skippedMonitors, eligibleCount } = useMemo(() => {
    const bySpace = new Map<string | undefined, string[]>();
    const skipped: Array<{ id: string; name: string }> = [];
    let eligible = 0;
    for (const monitor of monitors) {
      const id = monitor[ConfigKey.CONFIG_ID];
      if (!isMonitorBulkEditable(monitor, canUsePublicLocations)) {
        skipped.push({ id, name: monitor[ConfigKey.NAME] });
        continue;
      }
      eligible += 1;
      const { spaceId: targetSpaceId } = getMonitorSpaceToAppend(
        space,
        monitor[ConfigKey.KIBANA_SPACES]
      );
      const ids = bySpace.get(targetSpaceId) ?? [];
      ids.push(id);
      bySpace.set(targetSpaceId, ids);
    }
    return { updatesBySpace: bySpace, skippedMonitors: skipped, eligibleCount: eligible };
  }, [monitors, canUsePublicLocations, space]);

  const handleConfirm = useCallback(async () => {
    setIsUpdating(true);
    try {
      const responses = await Promise.all(
        [...updatesBySpace.entries()].map(([targetSpaceId, ids]) =>
          fetchBulkUpdateMonitors({
            updates: ids.map((id) => ({
              id,
              attributes: { [ConfigKey.ENABLED]: enabled },
            })),
            spaceId: targetSpaceId,
          })
        )
      );
      const result = responses.flatMap((response) => response.result);
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
      // The action ran (success or failure), so the selection is now stale.
      onCompleted?.();
      onClose();
    }
  }, [updatesBySpace, enabled, reloadPage, onCompleted, onClose]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={getTitle(enabled, eligibleCount)}
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={handleConfirm}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={enabled ? ENABLE_LABEL : DISABLE_LABEL}
      confirmButtonDisabled={eligibleCount === 0}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      isLoading={isUpdating}
    >
      <EuiText size="s">
        <p>{getDescription(enabled, eligibleCount)}</p>
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
                      'Project and Terraform-managed monitors cannot be edited here (update them from their source instead), and monitors using Elastic managed locations require additional permissions.',
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
        defaultMessage: '{count, plural, one {# monitor} other {# monitors}} enabled successfully.',
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
