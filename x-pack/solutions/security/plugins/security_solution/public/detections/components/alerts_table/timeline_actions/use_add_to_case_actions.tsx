/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';
import type { AlertTableContextMenuItem } from '../types';

export interface UseAddToCaseActions {
  onMenuItemClick: () => void;
  ariaLabel?: string;
  ecsData?: Ecs;
  nonEcsData?: TimelineNonEcsData[];
  onSuccess?: () => Promise<void>;
  refetch?: (() => void) | undefined;
}

export const useAddToCaseActions = ({
  onMenuItemClick,
  ariaLabel,
  ecsData,
  nonEcsData,
  onSuccess,
  refetch,
}: UseAddToCaseActions) => {
  const { cases: casesUi } = useKibana().services;
  const userCasesPermissions = casesUi.helpers.canUseCases([APP_ID]);

  const isAlert = useMemo(() => {
    return ecsData?.event?.kind?.includes('signal');
  }, [ecsData]);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    if (!isAlert) {
      return ecsData?._id
        ? [
            {
              eventId: ecsData?._id ?? '',
              index: ecsData?._index ?? '',
              type: AttachmentType.event,
            },
          ]
        : [];
    }

    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: casesUi.helpers.getRuleIdFromEvent({ ecs: ecsData, data: nonEcsData ?? [] }),
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
  const observables = useMemo(
    () => (ecsData ? casesUi.helpers.getObservablesFromEcs(ecsData) : undefined),
    [ecsData, casesUi.helpers]
  );
  const handleAddToNewCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    createCaseFlyout.open({
      attachments: caseAttachments,
      observables,
    });
  }, [onMenuItemClick, createCaseFlyout, caseAttachments, observables]);

  const handleAddToExistingCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    selectCaseModal.open({
      getAttachments: () => caseAttachments,
      getObservables: observables ? () => observables : undefined,
    });
  }, [caseAttachments, onMenuItemClick, observables, selectCaseModal]);

  const addToCaseActionItems: AlertTableContextMenuItem[] = useMemo(() => {
    if (userCasesPermissions.createComment && userCasesPermissions.read) {
      return [
        // add to existing case menu item
        {
          'aria-label': ariaLabel,
          'data-test-subj': 'add-to-existing-case-action',
          key: 'add-to-existing-case-action',
          onClick: handleAddToExistingCaseClick,
          size: 's',
          name: ADD_TO_EXISTING_CASE,
        },
        // add to new case menu item
        {
          'aria-label': ariaLabel,
          'data-test-subj': 'add-to-new-case-action',
          key: 'add-to-new-case-action',
          onClick: handleAddToNewCaseClick,
          size: 's',
          name: ADD_TO_NEW_CASE,
        },
      ];
    }
    return [];
  }, [
    userCasesPermissions.createComment,
    userCasesPermissions.read,
    ariaLabel,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
  ]);

  return {
    addToCaseActionItems,
    handleAddToNewCaseClick,
    handleAddToExistingCaseClick,
  };
};
