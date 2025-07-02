/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useEffect, useCallback } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { type PageAttachmentPersistedState, PAGE_ATTACHMENT_TYPE } from '@kbn/observability-schema';
import { EuiButton } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import { usePageSummary } from '../../../hooks/use_page_summary';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
const AddToCase = () => {
  const { cases, observabilityAIAssistant } = useKibana<ClientPluginsStart>().services;

  const { monitor } = useSelectedMonitor();

  const {
    hooks: { useCasesAddToExistingCaseModal },
  } = cases;
  const selectCaseModal = useCasesAddToExistingCaseModal();
  // TODO: First convert to absolute time before storing the attachment
  const pathname = `${window.location.pathname}${window.location.search}`;

  /*
   * TODO: We should store screen context event if the AI assistant is not available
   * so that if a user ever adds the AI Assistant the context is already there
   * Currently we're using service.getScreenContexts() to get the screen context
   * but we can also use our hooks (ex: useMonitorScreenContext) to return the screen context
   * manually
   */
  const { summary, setSummary, generateSummary, screenContexts } = usePageSummary();

  const attachmentState: PageAttachmentPersistedState | null = useMemo(() => {
    if (!monitor?.name) {
      return null;
    }
    return {
      type: 'synthetics-monitor-history',
      url: {
        pathAndQuery: pathname,
        iconType: 'logoObservability',
        actionLabel: i18n.translate('xpack.synthetics.addToCase.viewInMonitorHistory', {
          defaultMessage: 'View in Monitor History',
        }),
        label: i18n.translate('xpack.synthetics.addToCase.monitorHistoryLabel', {
          defaultMessage: 'Synthetic Monitor History: "{monitorName}"',
          values: { monitorName: monitor.name },
        }),
      },
      screenContext: screenContexts || [],
      summary: summary || undefined,
    };
  }, [pathname, monitor?.name, screenContexts, summary]);

  const onClick = useCallback(() => {
    if (!attachmentState) {
      return;
    }

    if (!observabilityAIAssistant) {
      selectCaseModal.open({
        getAttachments: () => [
          {
            type: AttachmentType.persistableState,
            persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
            persistableStateAttachmentState: attachmentState,
          },
        ],
      });
    } else {
      generateSummary();
    }
  }, [attachmentState, generateSummary, observabilityAIAssistant, selectCaseModal]);

  // TODO: need loading effect for button while fetching the summary
  useEffect(() => {
    if (summary) {
      selectCaseModal.open({
        getAttachments: () => [
          {
            type: AttachmentType.persistableState,
            persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
            persistableStateAttachmentState: {
              ...attachmentState,
              summary,
            },
          },
        ],
      });
      setSummary(null); // Reset summary after opening the modal
    }
  });

  if (!attachmentState) {
    return null;
  }

  return (
    <EuiButton data-test-subj="syntheticsAddToCaseButton" onClick={onClick}>
      {i18n.translate('xpack.synthetics.addToCase.addToCaseButtonLabel', {
        defaultMessage: 'Add to Case',
      })}
    </EuiButton>
  );
};

export const AddToCaseButton = () => {
  const { cases, observabilityAIAssistant } = useKibana<ClientPluginsStart>().services;
  const {
    helpers: { canUseCases },
    ui: { getCasesContext },
  } = cases;
  const ObservabilityAIAssistantChatServiceContext =
    observabilityAIAssistant?.ObservabilityAIAssistantChatServiceContext;
  const obsAIService = observabilityAIAssistant?.service;

  const casePermissions = canUseCases();
  const CasesContext = useMemo(() => getCasesContext(), [getCasesContext]);
  const hasCasesPermissions =
    casePermissions.read && casePermissions.update && casePermissions.push;

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return obsAIService?.start({ signal }).catch((error) => {
        // TODO: Handle error appropriately
        console.log('error', error);
        return null;
      });
    },
    [obsAIService]
  );

  if (!hasCasesPermissions) {
    return null;
  }

  const Button = (
    <CasesContext owner={['observability']} permissions={casePermissions}>
      <AddToCase />
    </CasesContext>
  );

  if (observabilityAIAssistant && ObservabilityAIAssistantChatServiceContext && chatService.value) {
    return (
      <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value || undefined}>
        {Button}
      </ObservabilityAIAssistantChatServiceContext.Provider>
    );
  }

  // TODO: Handle the case where the chat service is not available
  return null;
};
