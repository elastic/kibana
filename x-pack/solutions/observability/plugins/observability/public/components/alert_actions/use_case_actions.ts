/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAttachmentsWithoutOwner, CasesPublicStart } from '@kbn/cases-plugin/public';
import { useCallback, useMemo, useState } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { Alert } from '@kbn/alerting-types';
import type { EventNonEcsData } from '../../../common/typings';
import { useKibana } from '../../utils/kibana_react';

export const useCaseActions = ({ alert, refresh }: { alert: Alert; refresh?: () => void }) => {
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
  const ecsData = useMemo<Ecs>(
    () => ({
      _id: alert._id,
      _index: alert._index,
    }),
    [alert._id, alert._index]
  );
  const data = useMemo(
    () =>
      Object.entries(alert ?? {}).reduce<EventNonEcsData[]>(
        (acc, [field, value]) => [...acc, { field, value: value as string[] }],
        []
      ),
    [alert]
  );

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: getRuleIdFromEvent({ ecs: ecsData, data: data ?? [] }),
          },
        ]
      : [];
  }, [ecsData, getRuleIdFromEvent, data]);

  const createCaseFlyout = useCasesAddToNewCaseFlyout({ onSuccess });
  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const handleAddToNewCaseClick = () => {
    createCaseFlyout.open({ attachments: caseAttachments });
    closeActionsPopover();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal.open({ getAttachments: () => caseAttachments });
    closeActionsPopover();
  };

  return {
    isPopoverOpen,
    setIsPopoverOpen,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
  };
};
