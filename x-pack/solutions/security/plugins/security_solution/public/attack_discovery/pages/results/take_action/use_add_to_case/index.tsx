/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMENT_ATTACHMENT_TYPE, SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type {
  CaseAttachmentWithoutOwner,
  CaseAttachmentsWithoutOwner,
} from '@kbn/cases-plugin/public/types';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { getOriginalAlertIds, type Replacements } from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';

interface Props {
  canUserCreateAndReadCases: () => boolean;
  onClick?: () => void;
  /** Called once the attachments have been posted, with the case they were posted to. */
  onSuccess?: (theCase: CaseUI, isNewCase: boolean) => void;
  title: string;
}

/** Attaches the discoveries as markdown comments plus their constituent alerts. */
interface AddMarkdownToCaseParams {
  alertIds: string[];
  markdownComments: string[];
  replacements?: Replacements;
}

/** Attaches whatever the caller builds once the user has picked (or created) a case. */
interface AddAttachmentsToCaseParams {
  /**
   * Builds the payload for the chosen case, or with no case before the create-case flyout has one.
   * Must be pure, as the case selector also calls it on every render.
   */
  getAttachments: (theCase?: CaseUI) => CaseAttachmentsWithoutOwner;
}

export type AddToCaseParams = AddMarkdownToCaseParams | AddAttachmentsToCaseParams;

export const useAddToCase = ({
  canUserCreateAndReadCases,
  onClick,
  onSuccess,
  title,
}: Props): {
  disabled: boolean;
  onAddToCase: (params: AddToCaseParams) => void;
} => {
  const { cases } = useKibana().services;
  const { alertsIndexPattern } = useAssistantContext();
  const headerContent = useMemo(
    () => <div>{i18n.CREATE_A_CASE_FOR_ATTACK_DISCOVERY(title)}</div>,
    [title]
  );

  const { open: openSelectCaseModal } = cases.hooks.useCasesAddToExistingCaseModal({
    createCaseFlyout: {
      headerContent,
      initialValue: {
        description: i18n.CASE_DESCRIPTION(title),
        title,
      },
    },
    onClose: onClick,
    onSuccess,
    successToaster: {
      content: i18n.ADD_TO_CASE_SUCCESS,
    },
  });

  const onAddToCase = useCallback(
    (params: AddToCaseParams) => {
      if ('getAttachments' in params) {
        const { getAttachments } = params;
        openSelectCaseModal({ getAttachments: ({ theCase }) => getAttachments(theCase) });
        return;
      }

      const { alertIds, markdownComments, replacements } = params;

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
