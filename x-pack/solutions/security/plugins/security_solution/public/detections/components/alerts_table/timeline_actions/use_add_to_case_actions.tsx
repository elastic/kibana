/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddToCaseActionPanel, ADD_TO_CASE, CASE_TYPE } from '@kbn/response-ops-alerts-table';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';
import type { AlertTableContextMenuItem } from '../types';
import { generateEventAttachmentWithoutOwner } from '../../../../cases/attachments/event/utils';

export const ADD_TO_CASE_ACTION_IDS = {
  addToCase: 'add-to-case-action',
  addToExistingCase: 'add-to-existing-case-action',
  addToNewCase: 'add-to-new-case-action',
} as const;

const ADD_TO_CASE_PANEL_ID = 'add-to-case-panel';

export interface UseAddToCaseActions {
  onMenuItemClick: () => void;
  ariaLabel?: string;
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
  onSuccess?: () => Promise<void>;
  onActionClick?: (
    actionId:
      | typeof ADD_TO_CASE_ACTION_IDS.addToNewCase
      | typeof ADD_TO_CASE_ACTION_IDS.addToExistingCase
  ) => void;
  useNestedCaseActions?: boolean;
  refetch?: (() => void) | undefined;
}

export const useAddToCaseActions = ({
  onMenuItemClick,
  ariaLabel,
  ecsData,
  nonEcsData,
  onSuccess,
  onActionClick,
  useNestedCaseActions = false,
  refetch,
}: UseAddToCaseActions) => {
  const { cases: casesUi } = useKibana().services;
  const userCasesPermissions = casesUi.helpers.canUseCases([APP_ID]);

  const isAlert = useMemo(() => {
    return ecsData?.event?.kind?.includes('signal');
  }, [ecsData]);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    if (!isAlert) {
      const eventAttachment = generateEventAttachmentWithoutOwner({
        attachmentId: ecsData?._id,
        index: ecsData?._index,
      });
      return eventAttachment ? [eventAttachment] : [];
    }

    return ecsData?._id
      ? [
          {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            attachmentId: ecsData._id,
            metadata: {
              index: ecsData._index ?? '',
              rule: casesUi.helpers.getRuleIdFromEvent({ ecs: ecsData, data: nonEcsData ?? [] }),
            },
          },
        ]
      : [];
  }, [casesUi.helpers, ecsData, isAlert, nonEcsData]);

  const onCaseSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess();
    }

    if (refetch) {
      refetch();
    }
  }, [onSuccess, refetch]);

  const createCaseArgs = useMemo(() => {
    return {
      onClose: onMenuItemClick,
      onSuccess: onCaseSuccess,
    };
  }, [onMenuItemClick, onCaseSuccess]);

  const createCaseFlyout = casesUi.hooks.useCasesAddToNewCaseFlyout(createCaseArgs);

  const selectCaseArgs = useMemo(() => {
    return {
      onClose: onMenuItemClick,
      onSuccess: onCaseSuccess,
    };
  }, [onMenuItemClick, onCaseSuccess]);

  const selectCaseModal = casesUi.hooks.useCasesAddToExistingCaseModal(selectCaseArgs);

  const handleAddToNewCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    onActionClick?.(ADD_TO_CASE_ACTION_IDS.addToNewCase);
    createCaseFlyout.open({
      attachments: caseAttachments,
    });
  }, [onMenuItemClick, onActionClick, createCaseFlyout, caseAttachments]);

  const handleAddToExistingCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    onActionClick?.(ADD_TO_CASE_ACTION_IDS.addToExistingCase);
    selectCaseModal.open({
      getAttachments: () => caseAttachments,
    });
  }, [caseAttachments, onActionClick, onMenuItemClick, selectCaseModal]);

  const addToCaseActionItems: AlertTableContextMenuItem[] = useMemo(() => {
    if (!userCasesPermissions.createComment || !userCasesPermissions.read) {
      return [];
    }

    if (useNestedCaseActions) {
      return [
        {
          'aria-label': ariaLabel,
          'data-test-subj': ADD_TO_CASE_ACTION_IDS.addToCase,
          key: ADD_TO_CASE_ACTION_IDS.addToCase,
          name: ADD_TO_CASE,
          panel: ADD_TO_CASE_PANEL_ID,
        },
      ];
    }

    return [
      {
        'aria-label': ariaLabel,
        'data-test-subj': ADD_TO_CASE_ACTION_IDS.addToExistingCase,
        key: ADD_TO_CASE_ACTION_IDS.addToExistingCase,
        onClick: handleAddToExistingCaseClick,
        name: ADD_TO_EXISTING_CASE,
      },
      {
        'aria-label': ariaLabel,
        'data-test-subj': ADD_TO_CASE_ACTION_IDS.addToNewCase,
        key: ADD_TO_CASE_ACTION_IDS.addToNewCase,
        onClick: handleAddToNewCaseClick,
        name: ADD_TO_NEW_CASE,
      },
    ];
  }, [
    ariaLabel,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    useNestedCaseActions,
    userCasesPermissions.createComment,
    userCasesPermissions.read,
  ]);
  const addToCaseActionPanels: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      useNestedCaseActions && userCasesPermissions.createComment && userCasesPermissions.read
        ? [
            {
              id: ADD_TO_CASE_PANEL_ID,
              title: CASE_TYPE,
              content: (
                <AddToCaseActionPanel
                  actions={[
                    {
                      id: ADD_TO_CASE_ACTION_IDS.addToNewCase,
                      label: ADD_TO_NEW_CASE,
                      dataTestSubj: ADD_TO_CASE_ACTION_IDS.addToNewCase,
                      onClick: handleAddToNewCaseClick,
                    },
                    {
                      id: ADD_TO_CASE_ACTION_IDS.addToExistingCase,
                      label: ADD_TO_EXISTING_CASE,
                      dataTestSubj: ADD_TO_CASE_ACTION_IDS.addToExistingCase,
                      onClick: handleAddToExistingCaseClick,
                    },
                  ]}
                />
              ),
            },
          ]
        : [],
    [
      handleAddToExistingCaseClick,
      handleAddToNewCaseClick,
      useNestedCaseActions,
      userCasesPermissions.createComment,
      userCasesPermissions.read,
    ]
  );

  return {
    addToCaseActionItems,
    addToCaseActionPanels,
    handleAddToNewCaseClick,
    handleAddToExistingCaseClick,
  };
};
