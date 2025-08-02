/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { useCallback, useState } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { Alert } from '@kbn/alerting-types';
import { CasesService } from '@kbn/response-ops-alerts-table/types';
import type { EventNonEcsData } from '../../../common/typings';
import { useKibana } from '../../utils/kibana_react';
export const useCaseActions = ({
  alerts,
  refresh,
  services,
  caseContext,
}: {
  alerts: Alert[];
  refresh?: () => void;
  services: {
    /**
     * The cases service is optional: cases features will be disabled if not provided
     */
    cases?: CasesService;
  };
  caseContext?: string;
}) => {
  const { cases } = services;
  const { telemetryClient } = useKibana().services;
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onSuccess = useCallback(() => {
    refresh?.();
    if (caseContext) {
      telemetryClient.reportCaseSelectedFromObservability(caseContext);
    }
  }, [caseContext, refresh, telemetryClient]);

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess,
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
  const createCaseFlyout = cases?.hooks.useCasesAddToNewCaseFlyout({ onSuccess });
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
  };
};
