/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import type { EntityToAttach } from '../../../../../cases/attachments/entity';
import { generateEntityAttachmentsWithoutOwner } from '../../../../../cases/attachments/entity';
import { useEntityCasePermissions } from '../../../../../cases/attachments/entity/hooks/use_case_permission';
import { ADD_TO_EXISTING_CASE_TEST_ID } from '../../../../../../common/cases/attachments/entity/test_ids';

export const ADD_TO_CASE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.actions.addToCase',
  { defaultMessage: 'Add to case' }
);

export const ADD_TO_CASE_TEST_ID = ADD_TO_EXISTING_CASE_TEST_ID;

/**
 * Opens the existing-case picker for a resolved entity — the v.8 table uses a
 * single "Add to case" item instead of separate existing/new actions.
 */
export const useFaceliftAddToCase = (entity: EntityToAttach) => {
  const entityAttachmentsEnabled = useIsExperimentalFeatureEnabled('entityAttachmentsEnabled');
  const { cases } = useKibana().services;
  const attachmentsEnabled = cases.config.attachmentsEnabled;
  const { canAddToExistingCase } = useEntityCasePermissions();
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  const canAddToCase = Boolean(
    entityAttachmentsEnabled && attachmentsEnabled && entity.name && entity.id && canAddToExistingCase
  );

  const openAddToCase = useCallback(
    (closePopover: () => void) => {
      closePopover();
      selectCaseModal.open({
        getAttachments: () => generateEntityAttachmentsWithoutOwner(entity),
      });
    },
    [entity, selectCaseModal]
  );

  return { canAddToCase, openAddToCase };
};
