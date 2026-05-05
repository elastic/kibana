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
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import type { IdentityFields } from '../../document_details/shared/utils';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { NewAgentBuilderAttachment } from '../../../agent_builder/components/new_agent_builder_attachment';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../agent_builder/hooks/use_agent_builder_attachment';
import { ENTITY_PROMPT } from '../../../agent_builder/components/prompts';

export const HostPanelFooter = ({
  identityFields,
  entity,
}: {
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const hostName = useMemo(
    () => identityFields[EntityIdentifierFields.hostName] || Object.values(identityFields)[0] || '',
    [identityFields]
  );

  const entityAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.entity,
      attachmentData: {
        identifierType: EntityType.host,
        identifier: hostName,
        attachmentLabel: `${EntityType.host}: ${hostName}`,
      },
      attachmentPrompt: ENTITY_PROMPT,
    }),
    [hostName]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);

  const euidApi = useEntityStoreEuidApi();
  const euidEntityFilter = useMemo((): string | undefined => {
    if (!euidApi?.euid || !entity) {
      return undefined;
    }
    return euidApi.euid.kql.getEuidFilterBasedOnDocument('host', entity);
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
              isDisabled={!hostName}
              kqlQuery={euidEntityFilter ?? `host.name: "${hostName}"`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
