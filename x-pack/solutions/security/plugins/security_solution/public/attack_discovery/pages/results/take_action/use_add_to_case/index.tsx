/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common';
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

export const useAddToCase = ({
  canUserCreateAndReadCases,
  onClick,
}: Props): {
  disabled: boolean;
  onAddToCase: ({
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

  const onAddToCase = useCallback(
    ({
      alertIds,
      markdownComments,
      replacements,
    }: {
      alertIds: string[];
      markdownComments: string[];
      replacements?: Replacements;
    }) => {
      const userCommentAttachments = markdownComments.map<CaseAttachmentWithoutOwner>(
        (comment) => ({
          comment,
          type: AttachmentType.user,
        })
      );

      const originalAlertIds = getOriginalAlertIds({ alertIds, replacements });
      const alertAttachments = originalAlertIds.map<CaseAttachmentWithoutOwner>((alertId) => ({
        alertId,
        index: alertsIndexPattern ?? '',
        rule: {
          id: null,
          name: null,
        },
        type: AttachmentType.alert,
      }));

      openSelectCaseModal({
        getAttachments: () => [...userCommentAttachments, ...alertAttachments],
      });
    },
    [alertsIndexPattern, openSelectCaseModal]
  );

  return {
    disabled: !canUserCreateAndReadCases(),
    onAddToCase,
  };
};
