/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import React, { useCallback, useMemo } from 'react';
import { uniq, uniqBy } from 'lodash';

import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { KibanaContextProvider, useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import * as alertsTableI18n from '../../../../components/alerts_table/translations';
import {
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import * as i18n from '../translations';
import { UpdateAttacksModal } from '../confirmation_modal/update_attacks_modal';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import type {
  BaseAttackContextMenuItemsProps,
  BaseAttackProps,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackRunWorkflowContextMenuItemsProps extends BaseAttackContextMenuItemsProps {
  attacksForWorkflowRun: BaseAttackProps[];
}

export const useAttackRunWorkflowContextMenuItems = ({
  attacksForWorkflowRun,
  closePopover,
}: UseAttackRunWorkflowContextMenuItemsProps): BulkAttackContextMenuItems => {
  const { overlays, services } = useKibana();
  const spaceId = useSpaceId() ?? 'default';
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();

  const canRunWorkflow = useMemo(
    () =>
      !loading &&
      hasIndexWrite &&
      hasAttackIndexWrite &&
      workflowUIEnabled &&
      canExecuteWorkflow &&
      attacksForWorkflowRun.length > 0,
    [
      loading,
      hasIndexWrite,
      hasAttackIndexWrite,
      workflowUIEnabled,
      canExecuteWorkflow,
      attacksForWorkflowRun.length,
    ]
  );

  const attackIds = useMemo(
    () => attacksForWorkflowRun.map(({ attackId }) => attackId),
    [attacksForWorkflowRun]
  );
  const relatedAlertIds = useMemo(
    () => uniq(attacksForWorkflowRun.flatMap(({ relatedAlertIds: ids }) => ids)),
    [attacksForWorkflowRun]
  );
  const attackDiscoveryIndexName = useMemo(
    () => `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
    [spaceId]
  );
  const alertsIndexName = useMemo(() => `${DEFAULT_ALERTS_INDEX}-${spaceId}`, [spaceId]);
  const attackAlertIds = useMemo(
    () => attackIds.map((_id) => ({ _id, _index: attackDiscoveryIndexName })),
    [attackIds, attackDiscoveryIndexName]
  );
  const relatedAttackAlertIds = useMemo(
    () => relatedAlertIds.map((_id) => ({ _id, _index: alertsIndexName })),
    [relatedAlertIds, alertsIndexName]
  );
  const showRunAttackWorkflowModal = useCallback(
    (alertsCount: number): Promise<{ includeAllAlerts: boolean } | null> => {
      if (alertsCount <= 0) {
        return Promise.resolve({ includeAllAlerts: false });
      }

      return new Promise((resolve) => {
        const modalRef = overlays.openModal(
          <KibanaContextProvider services={services}>
            <UpdateAttacksModal
              attackDiscoveriesCount={1}
              alertsCount={alertsCount}
              customLabels={{
                title: i18n.INCLUDE_ALERTS_IN_WORKFLOW_TITLE,
                body: i18n.INCLUDE_ALERTS_IN_WORKFLOW_BODY({ alertsCount }),
                attackOnly: i18n.RUN_WORKFLOW_ON_ATTACK_ONLY,
                attackAndAlert: i18n.RUN_WORKFLOW_ON_ALERTS_AND_DISCOVERIES({
                  alertsCount,
                }),
              }}
              onCancel={() => {
                modalRef.close();
                resolve(null);
              }}
              onClose={() => {
                modalRef.close();
                resolve(null);
              }}
              onConfirm={async ({ updateAlerts }) => {
                modalRef.close();
                resolve({ includeAllAlerts: updateAlerts });
              }}
            />
          </KibanaContextProvider>
        );
      });
    },
    [overlays, services]
  );
  const onPrepareAlertIds = useCallback(async () => {
    const selectionResult = await showRunAttackWorkflowModal(relatedAttackAlertIds.length);
    if (selectionResult == null) return null;
    return selectionResult.includeAllAlerts
      ? uniqBy([...attackAlertIds, ...relatedAttackAlertIds], '_id')
      : attackAlertIds;
  }, [attackAlertIds, relatedAttackAlertIds, showRunAttackWorkflowModal]);

  const items = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              key: 'run-attack-workflow-action',
              name: alertsTableI18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              'data-test-subj': 'run-attack-workflow-action',
            },
          ]
        : [],
    [canRunWorkflow]
  );

  const panels = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              id: RUN_WORKFLOW_BULK_PANEL_ID,
              title: alertsTableI18n.SELECT_WORKFLOW_PANEL_TITLE,
              'data-test-subj': 'attack-workflow-context-menu-panel',
              content: (
                <AlertWorkflowsPanel
                  alertIds={attackAlertIds}
                  onPrepareAlertIds={onPrepareAlertIds}
                  onClose={closePopover ?? (() => {})}
                />
              ),
            },
          ]
        : [],
    [canRunWorkflow, attackAlertIds, onPrepareAlertIds, closePopover]
  );

  return useMemo(() => ({ items, panels }), [items, panels]);
};
