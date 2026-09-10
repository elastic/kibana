/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EntityType, EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { createDataProviders } from '../../../../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '../../../../../common/components/header_actions';
import { FLYOUT_ORIGIN, FLYOUT_TYPE } from '../../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { ENTITY_PROMPT } from '../../../../../agent_builder/components/prompts';
import { ADD_TO_CHAT } from '../../../../../agent_builder/components/translations';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useReportAddToChat } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import type { EntityToAttach } from '../../../../../cases/attachments/entity';
import { useEntityCaseTakeActionItems } from '../../../../../cases/attachments/entity/hooks/use_entity_case_take_action_items';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../constants';
import { getFaceliftRiskLevel } from './data';
import type { EntityRow } from './resolved_entities_data';

const TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.actions.investigateInTimeline',
  { defaultMessage: 'Investigate in Timeline' }
);

const GRAPH_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.actions.openEntityGraph',
  { defaultMessage: 'Open entity graph' }
);

const MORE_ACTIONS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.actions.moreActions',
  { defaultMessage: 'More actions' }
);

/** Three icon buttons × default action width (matches Alerts actions density). */
export const ENTITY_ROW_ACTIONS_WIDTH = DEFAULT_ACTION_BUTTON_WIDTH * 3;

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

export interface EntityRowActionsProps {
  row: EntityRow;
  canUseTimeline: boolean;
}

/**
 * Actions cell for the facelift Entities table: Investigate in Timeline, open
 * entity graph, and a More-actions menu (cases + chat).
 */
export const EntityRowActions: React.FC<EntityRowActionsProps> = ({ row, canUseTimeline }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { investigateInTimeline } = useInvestigateInTimeline();
  const { openEntityFlyout, openEntityGraphView } = useFlyoutApi();
  const { isAgentBuilderEnabled, hasValidAgentBuilderLicense } = useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();

  const entityToAttach = useMemo<EntityToAttach>(
    () => ({
      id: row.entityId,
      name: row.name,
      type: row.entityType,
      riskScore: row.riskScore,
      riskLevel: getFaceliftRiskLevel(row.riskScore),
    }),
    [row.entityId, row.name, row.entityType, row.riskScore]
  );

  const caseMenuItems = useEntityCaseTakeActionItems(entityToAttach);

  const entityAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.entity,
      attachmentData: {
        identifierType: row.entityType,
        identifier: row.name,
        attachmentLabel: `${row.entityType}: ${row.name}`,
      },
      attachmentPrompt: ENTITY_PROMPT,
    }),
    [row.entityType, row.name]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);

  const closeMore = useCallback(() => setIsMoreOpen(false), []);

  const onInvestigateInTimeline = useCallback(() => {
    const dataProviders = createDataProviders({
      contextId: ENTITY_ANALYTICS_TABLE_ID,
      field: EntityTypeToIdentifierField[row.entityType] || 'entity.id',
      values: row.name,
    });
    if (dataProviders?.length) {
      investigateInTimeline({ dataProviders });
    }
  }, [investigateInTimeline, row.entityType, row.name]);

  const onShowGraph = useCallback(() => {
    const flyoutType = flyoutTypeForEntityType(row.entityType);
    openEntityGraphView({
      entityId: row.entityId,
      scopeId: ENTITY_ANALYTICS_TABLE_ID,
      entityName: row.name,
      flyoutType,
      origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
      onShowEntity: ({ engineType, entityId, entityName }) => {
        openEntityFlyout({
          engineType: (engineType as EntityType | undefined) ?? row.entityType,
          entityId,
          entityName: entityName ?? row.name,
          scopeId: ENTITY_ANALYTICS_TABLE_ID,
          origin: FLYOUT_ORIGIN.GRAPH_NODE,
        });
      },
      onShowOriginatingEntity: () => {
        openEntityFlyout({
          engineType: row.entityType,
          entityId: row.entityId,
          entityName: row.name,
          scopeId: ENTITY_ANALYTICS_TABLE_ID,
          origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
        });
      },
    });
  }, [openEntityFlyout, openEntityGraphView, row]);

  const onAddToChat = useCallback(() => {
    reportAddToChat({ pathway: 'entity_flyout', attachments: ['entity'] });
    openAgentBuilderFlyout();
    closeMore();
  }, [closeMore, openAgentBuilderFlyout, reportAddToChat]);

  const morePanelItems = useMemo(() => {
    // Match Alerts more-actions order: existing case → new case → chat.
    const caseItems = caseMenuItems(closeMore);
    const existing = caseItems.find((item) => item.key === 'addToExistingCase');
    const createNew = caseItems.find((item) => item.key === 'addToNewCase');
    const items = [existing, createNew].filter(
      (item): item is React.ReactElement => item != null
    );

    if (isAgentBuilderEnabled) {
      items.push(
        <EuiContextMenuItem
          key="addToChat"
          data-test-subj="eaFaceliftAddToChat"
          disabled={!hasValidAgentBuilderLicense}
          onClick={onAddToChat}
        >
          {ADD_TO_CHAT}
        </EuiContextMenuItem>
      );
    }
    return items;
  }, [
    caseMenuItems,
    closeMore,
    hasValidAgentBuilderLicense,
    isAgentBuilderEnabled,
    onAddToChat,
  ]);

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      {canUseTimeline ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TIMELINE_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="timeline"
              color="text"
              aria-label={TIMELINE_LABEL}
              onClick={onInvestigateInTimeline}
              data-test-subj={`eaFaceliftTimelineAction-${row.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiToolTip content={GRAPH_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cluster"
            color="text"
            aria-label={GRAPH_LABEL}
            onClick={onShowGraph}
            data-test-subj={`eaFaceliftGraphAction-${row.id}`}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiToolTip content={MORE_ACTIONS} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="boxesHorizontal"
                color="text"
                aria-label={MORE_ACTIONS}
                onClick={() => setIsMoreOpen((open) => !open)}
                data-test-subj={`eaFaceliftMoreActions-${row.id}`}
              />
            </EuiToolTip>
          }
          isOpen={isMoreOpen}
          closePopover={closeMore}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel items={morePanelItems} size="s" />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
