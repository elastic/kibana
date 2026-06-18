/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { TakeAction } from '../shared/components/take_action';
import type { IdentityFields } from '../../document_details/shared/utils';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';
import { AiAssistantButton } from '../../../entity_analytics/components/ai_assistant_button/ai_assistant_button';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AddToNewCase } from '../../../cases/attachments/entity/components/add_to_new_case';
import { AddToExistingCase } from '../../../cases/attachments/entity/components/add_to_existing_case';
import {
  ADD_TO_NEW_CASE_TEST_ID,
  ADD_TO_EXISTING_CASE_TEST_ID,
} from '../../../cases/attachments/entity/components/test_ids';
import { useKibana } from '../../../common/lib/kibana';

export const UserPanelFooter = ({
  identityFields,
  entity,
  riskLevel,
}: {
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
  /** Current risk level for the entity, when known. Captured at attach time on the case. */
  riskLevel?: RiskSeverity;
}) => {
  const userName = useMemo(
    () => identityFields['user.name'] || Object.values(identityFields)[0] || '',
    [identityFields]
  );

  const euidApi = useEntityStoreEuidApi();
  const euidEntityFilter = useMemo((): string | undefined => {
    if (!euidApi?.euid || !entity) {
      return undefined;
    }
    return euidApi.euid.kql.getEuidFilterBasedOnDocument('user', entity);
  }, [euidApi?.euid, entity]);

  const entityAttachmentsEnabled = useIsExperimentalFeatureEnabled('entityAttachmentsEnabled');
  const { cases } = useKibana().services;
  const attachmentsEnabled = cases.config.attachmentsEnabled;

  // Canonical entity.id (EUID) from the store record. The case attachment is
  // resolved by querying `entity.id` directly, so we attach this rather than the
  // raw user.name — without it the attachment cannot be matched back to a store row.
  const entityStoreId = entity?.entity?.id;

  const additionalItems = useCallback(
    (closePopover: () => void) => {
      if (!entityAttachmentsEnabled || !attachmentsEnabled || !userName || !entityStoreId) {
        return [];
      }
      const entityToAttach = {
        id: entityStoreId,
        name: userName,
        type: 'user' as const,
        riskLevel,
      };
      return [
        <AddToNewCase
          key="addToNewCase"
          entity={entityToAttach}
          onClick={closePopover}
          data-test-subj={ADD_TO_NEW_CASE_TEST_ID}
        />,
        <AddToExistingCase
          key="addToExistingCase"
          entity={entityToAttach}
          onClick={closePopover}
          data-test-subj={ADD_TO_EXISTING_CASE_TEST_ID}
        />,
      ];
    },
    [attachmentsEnabled, entityAttachmentsEnabled, userName, entityStoreId, riskLevel]
  );

  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <AiAssistantButton
              entityType={EntityType.user}
              entityName={userName}
              telemetryPathway="entity_flyout"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TakeAction
              isDisabled={!userName}
              kqlQuery={euidEntityFilter ?? `user.name: "${userName}"`}
              additionalItems={additionalItems}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
