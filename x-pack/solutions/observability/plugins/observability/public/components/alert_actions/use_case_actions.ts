/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { useRemoveAlertFromCase } from '@kbn/cases-plugin/public';
import { useCallback, useState } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Alert } from '@kbn/alerting-types';
import type { CasesService } from '@kbn/response-ops-alerts-table/types';
import type { AlertAttachment } from '@kbn/cases-plugin/common/types/domain';
import type { EventNonEcsData } from '../../../common/typings';

export const useCaseActions = ({
  alerts,
  onAddToCase,
  services,
  caseId,
  alertAttachment,
}: {
  alerts: Alert[];
  onAddToCase?: ({ isNewCase }: { isNewCase: boolean }) => void;
  services: {
    /**
     * The cases service is optional: cases features will be disabled if not provided
     */
    cases?: CasesService;
  };
  caseId?: string;
  alertAttachment?: AlertAttachment;
}) => {
  const { cases } = services;
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onAddToExistingCase = useCallback(() => {
    onAddToCase?.({ isNewCase: false });
  }, [onAddToCase]);

  const { mutateAsync: removeAlertsFromCase } = useRemoveAlertFromCase();

  const removalSuccessToast = i18n.translate(
    'xpack.observability.alerts.actions.removeFromCaseSuccess',
    { defaultMessage: 'Alert removed from case' }
  );

  const handleRemoveAlertsFromCase = () => {
    alerts.forEach((alert) => {
      if (alertAttachment && caseId && alert._id) {
        removeAlertsFromCase({
          caseId,
          alertAttachment,
          alertId: alert._id,
          successToasterTitle: removalSuccessToast,
        });
        closeActionsPopover();
      }
    });
  };

  const onAddToNewCase = useCallback(() => {
    onAddToCase?.({ isNewCase: true });
  }, [onAddToCase]);

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess: onAddToExistingCase,
  });

  function getCaseAttachments(): CaseAttachmentsWithoutOwner {
    return alerts.map((alert) => ({
      alertId: alert?._id ?? '',
      index: alert?._index ?? '',
      type: AttachmentType.alert,
      rule: cases?.helpers.getRuleIdFromEvent({
        ecs: {
          _id: alert?._id ?? '',
          _index: alert?._index ?? '',
        },
        data:
          Object.entries(alert ?? {}).reduce<EventNonEcsData[]>(
            (acc, [field, value]) => [...acc, { field, value: value as string[] }],
            []
          ) ?? [],
      }) ?? { id: '', name: '' },
    }));
  }
  const createCaseFlyout = cases?.hooks.useCasesAddToNewCaseFlyout({ onSuccess: onAddToNewCase });
  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const handleAddToNewCaseClick = () => {
    createCaseFlyout?.open({ attachments: getCaseAttachments() });
    closeActionsPopover();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal?.open({ getAttachments: () => getCaseAttachments() });
    closeActionsPopover();
  };

  return {
    isPopoverOpen,
    setIsPopoverOpen,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    handleRemoveAlertsFromCase,
  };
};
