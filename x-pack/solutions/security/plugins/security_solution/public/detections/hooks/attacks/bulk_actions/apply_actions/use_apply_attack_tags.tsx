/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useSetUnifiedAlertsTags } from '../../../../../common/containers/unified_alerts/hooks/use_set_unified_alerts_tags';
import { useSetAttacksTags } from '../../../../../common/containers/attacks/hooks/use_set_attacks_tags';

import { useUpdateAttacksModal } from '../confirmation_modal/use_update_attacks_modal';
import type { BaseApplyAttackProps } from '../types';

interface ApplyAttackTagsProps extends BaseApplyAttackProps {
  /** Tags to add or remove */
  tags: { tags_to_add: string[]; tags_to_remove: string[] };
}

interface ApplyAttackTagsReturn {
  applyTags: (props: ApplyAttackTagsProps) => Promise<void>;
}

/**
 * Hook that provides a function to apply tags to attacks and optionally related alerts.
 * Shows a confirmation modal to let users choose whether to update only attacks or both attacks and related alerts.
 */
export const useApplyAttackTags = (): ApplyAttackTagsReturn => {
  const isPublicAttacksApiEnabled = useIsExperimentalFeatureEnabled('publicAttacksApiEnabled');
  const { mutateAsync: setUnifiedAlertsTags } = useSetUnifiedAlertsTags();
  const { mutateAsync: setAttacksTags } = useSetAttacksTags();
  const showModalIfNeeded = useUpdateAttacksModal();
  const {
    services: { telemetry },
  } = useKibana();

  const applyTags = useCallback(
    async ({
      tags,
      attackIds,
      relatedAlertIds,
      setIsLoading,
      onSuccess,
      telemetrySource,
    }: ApplyAttackTagsProps) => {
      // Show modal (if needed) and wait for user decision
      const result = await showModalIfNeeded({
        alertsCount: relatedAlertIds.length,
        attackDiscoveriesCount: attackIds.length,
      });
      if (result === null) {
        // User cancelled, don't proceed with update
        return;
      }

      if (telemetrySource) {
        telemetry.reportEvent(AttacksEventTypes.ActionTagsUpdated, {
          source: telemetrySource,
          scope: result.updateAlerts ? 'attack_and_related_alerts' : 'attack_only',
        });
      }

      setIsLoading?.(true);
      try {
        if (isPublicAttacksApiEnabled) {
          await setAttacksTags({
            ids: attackIds,
            tags,
            update_related_alerts: result.updateAlerts,
          });
        } else {
          const allIds = result.updateAlerts ? [...attackIds, ...relatedAlertIds] : attackIds;

          await setUnifiedAlertsTags({
            tags,
            ids: allIds,
          });
        }
        onSuccess?.();
      } finally {
        setIsLoading?.(false);
      }
    },
    [isPublicAttacksApiEnabled, setAttacksTags, setUnifiedAlertsTags, showModalIfNeeded, telemetry]
  );

  return { applyTags };
};
