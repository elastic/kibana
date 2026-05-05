/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { TakeAction } from '../shared/components/take_action';
import type { IdentityFields } from '../../document_details/shared/utils';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { NewAgentBuilderAttachment } from '../../../agent_builder/components/new_agent_builder_attachment';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../agent_builder/hooks/use_agent_builder_attachment';
import { ENTITY_PROMPT } from '../../../agent_builder/components/prompts';
import { EntityType } from '../../../../common/entity_analytics/types';

export const UserPanelFooter = ({
  identityFields,
  entity,
}: {
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const userName = useMemo(
    () => identityFields['user.name'] || Object.values(identityFields)[0] || '',
    [identityFields]
  );

  const entityAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.entity,
      attachmentData: {
        identifierType: EntityType.user,
        identifier: userName,
        attachmentLabel: `${EntityType.user}: ${userName}`,
      },
      attachmentPrompt: ENTITY_PROMPT,
    }),
    [userName]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);

  const euidApi = useEntityStoreEuidApi();
  const euidEntityFilter = useMemo((): string | undefined => {
    if (!euidApi?.euid || !entity) {
      return undefined;
    }
    return euidApi.euid.kql.getEuidFilterBasedOnDocument('user', entity);
  }, [euidApi?.euid, entity]);

  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {isAgentChatExperienceEnabled && (
            <EuiFlexItem grow={false}>
              <NewAgentBuilderAttachment
                onClick={openAgentBuilderFlyout}
                telemetry={{
                  pathway: 'entity_flyout',
                  attachments: ['entity'],
                }}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TakeAction
              isDisabled={!userName}
              kqlQuery={euidEntityFilter ?? `user.name: "${userName}"`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
