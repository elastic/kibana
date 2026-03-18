/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { RowControlColumn } from '@kbn/discover-utils';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { createDataProviders } from '../../../../../app/actions/add_to_timeline/data_provider';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../../../../common/constants';
import { getEntityFields } from '../utils';
import { ENTITY_ANALYTICS_TABLE_ID } from '../constants';

const createEntityDataProviders = (
  entityType: EntityType | undefined,
  entityName: string | undefined
) => {
  if (!entityName || !entityType) return null;
  const fieldName: string = EntityTypeToIdentifierField[entityType] || 'entity.id';
  return createDataProviders({
    contextId: ENTITY_ANALYTICS_TABLE_ID,
    field: fieldName,
    values: entityName,
  });
};

interface UseLeadingControlColumnsArgs {
  canUseTimeline: boolean;
  investigateInTimeline: (args: {
    dataProviders: NonNullable<ReturnType<typeof createDataProviders>>;
  }) => void;
  isAgentBuilderEnabled: boolean;
  agentBuilder: AgentBuilderPluginStart | undefined;
}

export const useLeadingControlColumns = ({
  canUseTimeline,
  investigateInTimeline,
  isAgentBuilderEnabled,
  agentBuilder,
}: UseLeadingControlColumnsArgs): RowControlColumn[] => {
  return useMemo(() => {
    const columns: RowControlColumn[] = [];

    if (canUseTimeline) {
      columns.push({
        id: 'entity-analytics-timeline-action',
        render: (Control, { record }) => {
          const { entityType, entityName } = getEntityFields(record);
          if (!entityName || !entityType) {
            return <Control iconType="timeline" label="" disabled onClick={undefined} />;
          }

          return (
            <Control
              iconType="timeline"
              label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.entitiesTable.investigateInTimeline',
                { defaultMessage: 'Investigate in timeline' }
              )}
              color="text"
              onClick={() => {
                const dataProviders = createEntityDataProviders(entityType, entityName);
                if (dataProviders?.length) {
                  investigateInTimeline({ dataProviders });
                }
              }}
              data-test-subj="entity-analytics-home-timeline-icon"
            />
          );
        },
      });
    }

    if (isAgentBuilderEnabled && agentBuilder?.openChat) {
      columns.push({
        id: 'entity-analytics-ai-action',
        render: (Control, { record }) => {
          const { entityType, entityName } = getEntityFields(record);
          if (!entityName || !entityType) {
            return <Control iconType="sparkles" label="" disabled onClick={undefined} />;
          }

          return (
            <Control
              iconType="sparkles"
              label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.entitiesTable.addToChat',
                { defaultMessage: 'Add to chat' }
              )}
              color="text"
              onClick={() => {
                const attachmentId = `${SecurityAgentBuilderAttachments.entity}-${Date.now()}`;
                agentBuilder.openChat({
                  autoSendInitialMessage: false,
                  newConversation: true,
                  initialMessage: i18n.translate(
                    'xpack.securitySolution.entityAnalytics.entitiesTable.aiInvestigationPrompt',
                    {
                      defaultMessage:
                        'Investigate this entity and provide relevant context about its risk and activity.',
                    }
                  ),
                  attachments: [
                    {
                      id: attachmentId,
                      type: SecurityAgentBuilderAttachments.entity,
                      data: {
                        identifierType: entityType,
                        identifier: entityName,
                        attachmentLabel: `${entityType}: ${entityName}`,
                      },
                    },
                  ],
                  sessionTag: 'security',
                  agentId: THREAT_HUNTING_AGENT_ID,
                });
              }}
              data-test-subj="entity-analytics-home-ai-action-icon"
            />
          );
        },
      });
    }

    return columns;
  }, [canUseTimeline, investigateInTimeline, isAgentBuilderEnabled, agentBuilder]);
};
