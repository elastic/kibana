/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Take-action menu for v.8 resolution groups — Timeline, graph, add to case,
 * and chat (the same resolved-entity actions as the table).
 */

import React, { useCallback, useMemo } from 'react';
import { EuiContextMenu } from '@elastic/eui';
import type { RawBucket } from '@kbn/grouping';
import { i18n } from '@kbn/i18n';

import {
  EntityType,
  EntityTypeToIdentifierField,
} from '../../../../../../common/entity_analytics/types';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { createDataProviders } from '../../../../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { FLYOUT_ORIGIN, FLYOUT_TYPE } from '../../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { ENTITY_PROMPT } from '../../../../../agent_builder/components/prompts';
import { ADD_TO_CHAT } from '../../../../../agent_builder/components/translations';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useReportAddToChat } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import type { EntityToAttach } from '../../../../../cases/attachments/entity';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../constants';
import type {
  EntitiesGroupingAggregation,
  TargetMetadataMap,
} from '../../entities_table/grouping/use_fetch_grouped_data';
import { getFaceliftRiskLevel } from './data';
import { ADD_TO_CASE_LABEL, ADD_TO_CASE_TEST_ID, useFaceliftAddToCase } from './use_facelift_add_to_case';

export const TAKE_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.takeAction',
  { defaultMessage: 'Take action' }
);

const TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.actions.investigateInTimeline',
  { defaultMessage: 'Investigate in Timeline' }
);

const GRAPH_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.actions.openEntityGraph',
  { defaultMessage: 'Open entity graph' }
);

const flyoutTypeForEntityType = (entityType: EntityType) => {
  switch (entityType) {
    case EntityType.user:
      return FLYOUT_TYPE.USER;
    case EntityType.host:
      return FLYOUT_TYPE.HOST;
    case EntityType.service:
      return FLYOUT_TYPE.SERVICE;
    default:
      return FLYOUT_TYPE.GENERIC;
  }
};

export interface FaceliftResolutionTakeActionMenuProps {
  bucket: RawBucket<EntitiesGroupingAggregation>;
  targetMetadata: TargetMetadataMap;
  canUseTimeline: boolean;
  closePopover: () => void;
}

export const FaceliftResolutionTakeActionMenu: React.FC<FaceliftResolutionTakeActionMenuProps> = ({
  bucket,
  targetMetadata,
  canUseTimeline,
  closePopover,
}) => {
  const entityId = String(bucket.key_as_string ?? bucket.key);
  const metadata = targetMetadata.get(entityId);
  const name = metadata?.name ?? entityId;
  const entityType = metadata?.type ?? EntityType.user;
  const riskScore = metadata?.riskScore ?? undefined;

  const { investigateInTimeline } = useInvestigateInTimeline();
  const { openEntityFlyout, openEntityGraphView } = useFlyoutApi();
  const { isAgentBuilderEnabled, hasValidAgentBuilderLicense } = useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();

  const entityToAttach = useMemo<EntityToAttach>(
    () => ({
      id: entityId,
      name,
      type: entityType,
      riskScore: riskScore ?? undefined,
      riskLevel: riskScore != null ? getFaceliftRiskLevel(riskScore) : undefined,
    }),
    [entityId, name, entityType, riskScore]
  );

  const { canAddToCase, openAddToCase } = useFaceliftAddToCase(entityToAttach);

  const entityAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.entity,
      attachmentData: {
        identifierType: entityType,
        identifier: name,
        attachmentLabel: `${entityType}: ${name}`,
      },
      attachmentPrompt: ENTITY_PROMPT,
    }),
    [entityType, name]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);

  const onInvestigateInTimeline = useCallback(() => {
    const dataProviders = createDataProviders({
      contextId: ENTITY_ANALYTICS_TABLE_ID,
      field: EntityTypeToIdentifierField[entityType] || 'entity.id',
      values: name,
    });
    if (dataProviders?.length) {
      investigateInTimeline({ dataProviders });
    }
    closePopover();
  }, [closePopover, entityType, investigateInTimeline, name]);

  const onShowGraph = useCallback(() => {
    const flyoutType = flyoutTypeForEntityType(entityType);
    openEntityGraphView({
      entityId,
      scopeId: ENTITY_ANALYTICS_TABLE_ID,
      entityName: name,
      flyoutType,
      origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
      onShowEntity: ({ engineType, entityId: id, entityName }) => {
        openEntityFlyout({
          engineType: (engineType as EntityType | undefined) ?? entityType,
          entityId: id,
          entityName: entityName ?? name,
          scopeId: ENTITY_ANALYTICS_TABLE_ID,
          origin: FLYOUT_ORIGIN.GRAPH_NODE,
        });
      },
      onShowOriginatingEntity: () => {
        openEntityFlyout({
          engineType: entityType,
          entityId,
          entityName: name,
          scopeId: ENTITY_ANALYTICS_TABLE_ID,
          origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
        });
      },
    });
    closePopover();
  }, [closePopover, entityId, entityType, name, openEntityFlyout, openEntityGraphView]);

  const onAddToChat = useCallback(() => {
    reportAddToChat({ pathway: 'entity_flyout', attachments: ['entity'] });
    openAgentBuilderFlyout();
    closePopover();
  }, [closePopover, openAgentBuilderFlyout, reportAddToChat]);

  const items = useMemo(() => {
    return [
      {
        key: 'investigateInTimeline',
        name: TIMELINE_LABEL,
        icon: 'timeline',
        disabled: !canUseTimeline,
        onClick: onInvestigateInTimeline,
        'data-test-subj': 'eaFaceliftGroupTimelineAction',
      },
      {
        key: 'openEntityGraph',
        name: GRAPH_LABEL,
        icon: 'cluster',
        onClick: onShowGraph,
        'data-test-subj': 'eaFaceliftGroupGraphAction',
      },
      ...(canAddToCase
        ? [
            {
              key: 'addToCase',
              name: ADD_TO_CASE_LABEL,
              icon: 'briefcase',
              onClick: () => openAddToCase(closePopover),
              'data-test-subj': ADD_TO_CASE_TEST_ID,
            },
          ]
        : []),
      ...(isAgentBuilderEnabled
        ? [
            {
              key: 'addToChat',
              name: ADD_TO_CHAT,
              icon: 'addToChat',
              disabled: !hasValidAgentBuilderLicense,
              onClick: onAddToChat,
              'data-test-subj': 'eaFaceliftGroupAddToChat',
            },
          ]
        : []),
    ];
  }, [
    canAddToCase,
    canUseTimeline,
    closePopover,
    hasValidAgentBuilderLicense,
    isAgentBuilderEnabled,
    onAddToChat,
    onInvestigateInTimeline,
    onShowGraph,
    openAddToCase,
  ]);

  return <EuiContextMenu initialPanelId={0} size="s" panels={[{ id: 0, items }]} />;
};
