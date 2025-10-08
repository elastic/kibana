/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { EuiButton, EuiText } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';

import type { Rule } from '@kbn/alerts-ui-shared';
import { useKibana } from '../../../utils/kibana_react';
import type { TopAlert } from '../../../typings/alerts';

export function AddToCaseButton({
  alert,
  alertIndex,
  rule,
  setIsPopoverOpen,
}: {
  alert: TopAlert | null;
  alertIndex?: string;
  rule?: Rule;
  setIsPopoverOpen: (isOpen: boolean) => void;
}) {
  const {
    services,
    services: { telemetryClient },
  } = useKibana();

  const selectCaseModal = services.cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess: ({ updatedAt }) => {
      // If the case is newly created the updatedAt will be null
      // onSuccess doesn't provide a way to know if the case was created or updated
      // onCreateCaseClicked callback is NOT triggered
      const isNewCaseCreated = !updatedAt;
      telemetryClient.reportAlertAddedToCase(
        isNewCaseCreated,
        'alertDetails.addToCaseBtn',
        rule?.ruleTypeId || 'unknown'
      );
    },
  });

  const attachments: CaseAttachmentsWithoutOwner =
    alert && rule
      ? [
          {
            alertId: alert?.fields[ALERT_UUID] || '',
            index: alertIndex || '',
            rule: {
              id: rule.id,
              name: rule.name,
            },
            type: AttachmentType.alert,
          },
        ]
      : [];

  const handleAddToCase = () => {
    setIsPopoverOpen(false);
    selectCaseModal?.open({ getAttachments: () => attachments });
  };

  return (
    <EuiButton
      fill
      iconType="plus"
      onClick={handleAddToCase}
      data-test-subj={`add-to-cases-button-${rule?.ruleTypeId}`}
    >
      <EuiText size="s">
        {i18n.translate('xpack.observability.alertDetails.addToCase', {
          defaultMessage: 'Add to case',
        })}
      </EuiText>
    </EuiButton>
  );
}
