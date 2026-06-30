/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import type { AlertTableContextMenuItem } from '../../detections/components/alerts_table/types';
import { useKibana } from '../../common/lib/kibana';
import { createInvestigationFromAlert } from '../services/create_investigation_from_alert';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';
import { useReportAddToChat } from './use_report_add_to_chat';
import { useSelectInvestigationModal } from './use_select_investigation_modal';
import {
  ADD_TO_EXISTING_INVESTIGATION,
  ADD_TO_EXISTING_INVESTIGATION_ERROR,
  START_INVESTIGATION,
  START_INVESTIGATION_ERROR,
} from '../translations';

export interface UseAddToInvestigationActions {
  onMenuItemClick: () => void;
  ariaLabel?: string;
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}

export const useAddToInvestigationActions = ({
  onMenuItemClick,
  ariaLabel,
  ecsData,
  nonEcsData,
}: UseAddToInvestigationActions) => {
  const {
    application,
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();
  const [isCreatingInvestigation, setIsCreatingInvestigation] = useState(false);

  const navigateToInvestigation = useCallback(
    async (conversationId: string) => {
      await application.navigateToApp(AGENTBUILDER_APP_ID, {
        path: `/conversations/${conversationId}`,
      });
    },
    [application]
  );

  const { open: openSelectInvestigationModal, selectInvestigationModal } =
    useSelectInvestigationModal({
      onSuccess: navigateToInvestigation,
    });

  const handleStartInvestigationClick = useCallback(async () => {
    onMenuItemClick();
    setIsCreatingInvestigation(true);

    try {
      const conversationId = await createInvestigationFromAlert({
        http,
        ecsData,
        nonEcsData,
      });

      reportAddToChat({
        pathway: 'alerts_flyout',
        attachments: ['alert'],
      });

      await navigateToInvestigation(conversationId);
    } catch (error) {
      toasts.addError(error as Error, {
        title: START_INVESTIGATION_ERROR,
      });
    } finally {
      setIsCreatingInvestigation(false);
    }
  }, [
    ecsData,
    http,
    navigateToInvestigation,
    nonEcsData,
    onMenuItemClick,
    reportAddToChat,
    toasts,
  ]);

  const handleAddToExistingInvestigationClick = useCallback(() => {
    onMenuItemClick();
    openSelectInvestigationModal({ ecsData, nonEcsData });
  }, [ecsData, nonEcsData, onMenuItemClick, openSelectInvestigationModal]);

  const isInvestigationActionDisabled = isCreatingInvestigation;

  const addToInvestigationActionItems: AlertTableContextMenuItem[] = useMemo(() => {
    if (!isAgentBuilderEnabled) {
      return [];
    }

    return [
      {
        'aria-label': ariaLabel,
        'data-test-subj': 'add-to-existing-investigation-action',
        key: 'add-to-existing-investigation-action',
        onClick: handleAddToExistingInvestigationClick,
        name: ADD_TO_EXISTING_INVESTIGATION,
        disabled: isInvestigationActionDisabled,
      },
      {
        'aria-label': ariaLabel,
        'data-test-subj': 'start-investigation-action',
        key: 'start-investigation-action',
        onClick: handleStartInvestigationClick,
        name: START_INVESTIGATION,
        disabled: isInvestigationActionDisabled,
      },
    ];
  }, [
    ariaLabel,
    handleAddToExistingInvestigationClick,
    handleStartInvestigationClick,
    isAgentBuilderEnabled,
    isInvestigationActionDisabled,
  ]);

  return {
    addToInvestigationActionItems,
    handleAddToExistingInvestigationClick,
    handleStartInvestigationClick,
    isCreatingInvestigation,
    selectInvestigationModal,
  };
};
