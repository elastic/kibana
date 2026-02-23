/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  ExternalReferenceStorageType,
  ATTACK_DISCOVERY_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import type { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/public/types';
import { useAssistantContext } from '@kbn/elastic-assistant';
import {
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  getOriginalAlertIds,
  type Replacements,
  type AttackDiscovery,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import { useCallback } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
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
    attackDiscoveries,
  }: {
    alertIds: string[];
    markdownComments: string[];
    replacements?: Replacements;
    attackDiscoveries?: Array<AttackDiscovery | AttackDiscoveryAlert>;
  }) => void;
} => {
  const { cases } = useKibana().services;
  const { alertsIndexPattern } = useAssistantContext();
  const spaceId = useSpaceId();

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
      attackDiscoveries,
    }: {
      alertIds: string[];
      markdownComments: string[];
      replacements?: Replacements;
      attackDiscoveries?: Array<AttackDiscovery | AttackDiscoveryAlert>;
    }) => {
      const userCommentAttachments = markdownComments.map<CaseAttachmentWithoutOwner>((x) => ({
        comment: x,
        type: AttachmentType.user,
      }));

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

      // Attach attack discoveries as external reference attachments
      // Only attach AttackDiscoveryAlert types (which have an id and are persisted as alerts)
      const attackDiscoveryAttachments: CaseAttachmentWithoutOwner[] =
        attackDiscoveries && spaceId
          ? attackDiscoveries
            .filter((ad) => ad.id != null && 'generationUuid' in ad)
            .map<CaseAttachmentWithoutOwner>((attackDiscovery) => {
              const alert = attackDiscovery as AttackDiscoveryAlert;
              return {
                type: AttachmentType.externalReference,
                externalReferenceId: alert.id,
                externalReferenceStorage: {
                  type: ExternalReferenceStorageType.elasticSearchDoc,
                },
                externalReferenceAttachmentTypeId: ATTACK_DISCOVERY_ATTACHMENT_TYPE,
                externalReferenceMetadata: {
                  attackDiscoveryAlertId: alert.id,
                  index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
                  generationUuid: alert.generationUuid,
                  title: alert.title,
                  timestamp: alert.timestamp,
                },
              };
            })
          : [];

      const attachments = [
        ...userCommentAttachments,
        ...alertAttachments,
        ...attackDiscoveryAttachments,
      ];

      openSelectCaseModal({ getAttachments: () => attachments });
    },
    [alertsIndexPattern, openSelectCaseModal, spaceId]
  );

  return {
    disabled: !canUserCreateAndReadCases(),
    onAddToExistingCase,
  };
};
