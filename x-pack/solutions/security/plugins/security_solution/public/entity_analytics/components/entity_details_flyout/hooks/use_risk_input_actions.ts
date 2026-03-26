/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { get, noop } from 'lodash/fp';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { InputAlert } from '../../../hooks/use_risk_contributing_alerts';

/**
 * The returned actions only support alerts risk inputs.
 */
export const useRiskInputActions = (inputs: InputAlert[], closePopover: () => void) => {
  const { cases: casesService } = useKibana().services;
  const createCaseFlyout = casesService?.hooks.useCasesAddToNewCaseFlyout({ onSuccess: noop });
  const selectCaseModal = casesService?.hooks.useCasesAddToExistingCaseModal();

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(
    () =>
      inputs.map(({ input, alert }: InputAlert) => ({
        alertId: input.id,
        index: input.index,
        type: AttachmentType.alert,
        rule: {
          id: get(ALERT_RULE_UUID, alert),
          name: get(ALERT_RULE_NAME, alert),
        },
      })),
    [inputs]
  );

  return useMemo(
    () => ({
      addToExistingCase: () => {
        closePopover();
        selectCaseModal.open({ getAttachments: () => caseAttachments });
      },
      addToNewCaseClick: () => {
        closePopover();
        createCaseFlyout.open({ attachments: caseAttachments });
      },
    }),
    [caseAttachments, closePopover, createCaseFlyout, selectCaseModal]
  );
};
