/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAttachmentsWithoutOwner, CasesPublicStart } from '@kbn/cases-plugin/public';
import { useCallback, useState } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { Alert } from '@kbn/alerting-types';
import type { EventNonEcsData } from '../../../common/typings';
import { useKibana } from '../../utils/kibana_react';

export const useCaseActions = ({ alerts, refresh }: { alerts: Alert[]; refresh?: () => void }) => {
  const services = useKibana().services;
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const {
    helpers: { getRuleIdFromEvent },
    hooks: { useCasesAddToNewCaseFlyout, useCasesAddToExistingCaseModal },
  } = services.cases! as unknown as CasesPublicStart; // Cases is guaranteed to be defined in Observability

  const onSuccess = useCallback(() => {
    refresh?.();
  }, [refresh]);

  const selectCaseModal = useCasesAddToExistingCaseModal({ onSuccess });

  function getCaseAttachments(): CaseAttachmentsWithoutOwner {
    return alerts.map((alert) => ({
      alertId: alert?._id ?? '',
      index: alert?._index ?? '',
      type: AttachmentType.alert,
      rule: getRuleIdFromEvent({
        ecs: {
          _id: alert?._id ?? '',
          _index: alert?._index ?? '',
        },
        data:
          Object.entries(alert ?? {}).reduce<EventNonEcsData[]>(
            (acc, [field, value]) => [...acc, { field, value: value as string[] }],
            []
          ) ?? [],
      }),
    }));
  }
  const createCaseFlyout = useCasesAddToNewCaseFlyout({ onSuccess });
  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const handleAddToNewCaseClick = () => {
    createCaseFlyout.open({ attachments: getCaseAttachments() });
    closeActionsPopover();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal.open({ getAttachments: () => getCaseAttachments() });
    closeActionsPopover();
  };

  return {
    isPopoverOpen,
    setIsPopoverOpen,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
  };
};
