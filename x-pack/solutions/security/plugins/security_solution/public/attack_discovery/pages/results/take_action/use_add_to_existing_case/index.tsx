/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMENT_ATTACHMENT_TYPE, SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/public/types';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { getOriginalAlertIds, type Replacements } from '@kbn/elastic-assistant-common';
import { useCallback } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';

interface Props {
  canUserCreateAndReadCases: () => boolean;
  onClick?: () => void;
}

export const useAddToExistingCase = ({
  canUserCreateAndReadCases,
  onClick,
}: Props): {
  disabled: boolean;
  onAddToExistingCase: ({
    alertIds,
    markdownComments,
    replacements,
  }: {
    alertIds: string[];
    markdownComments: string[];
    replacements?: Replacements;
  }) => void;
} => {
  const { cases } = useKibana().services;
  const { alertsIndexPattern } = useAssistantContext();

  const { open: openSelectCaseModal } = cases.hooks.useCasesAddToExistingCaseModal({
    onClose: onClick,
    successToaster: {
      title: i18n.ADD_TO_CASE_SUCCESS,
    },
  });

  const onAddToExistingCase = useCallback(
    ({
      alertIds,
      markdownComments,
      replacements,
    }: {
      alertIds: string[];
      markdownComments: string[];
      replacements?: Replacements;
    }) => {
      const userCommentAttachments = markdownComments.map<CaseAttachmentWithoutOwner>((x) => ({
        type: COMMENT_ATTACHMENT_TYPE,
        data: { content: x },
      }));

      const originalAlertIds = getOriginalAlertIds({ alertIds, replacements });
      const alertAttachments = originalAlertIds.map<CaseAttachmentWithoutOwner>((alertId) => ({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: alertId,
        metadata: {
          index: alertsIndexPattern ?? '',
          rule: {
            id: null,
            name: null,
          },
        },
      }));

      const attachments = [...userCommentAttachments, ...alertAttachments];

      openSelectCaseModal({ getAttachments: () => attachments });
    },
    [alertsIndexPattern, openSelectCaseModal]
  );

  return {
    disabled: !canUserCreateAndReadCases(),
    onAddToExistingCase,
  };
};
