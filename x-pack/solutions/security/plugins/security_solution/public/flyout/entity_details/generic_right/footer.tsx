/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import { ASK_AI_ASSISTANT } from '../shared/translations';
import { TakeAction } from '../shared/components/take_action';
import { useAssetInventoryAssistant } from './hooks/use_asset_inventory_assistant';

interface GenericEntityFlyoutFooterProps {
  entityId: EntityEcs['id'];
  entityFields: Record<string, string[]>;
}

export const GenericEntityFlyoutFooter = ({
  entityId,
  entityFields,
}: GenericEntityFlyoutFooterProps) => {
  const { showAssistant, showAssistantOverlay } = useAssetInventoryAssistant({
    entityId,
    entityFields,
  });

  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {showAssistant && (
            <EuiFlexItem grow={false}>
              <NewChatByTitle showAssistantOverlay={showAssistantOverlay} text={ASK_AI_ASSISTANT} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TakeAction
              isDisabled={!entityId}
              kqlQuery={`entity.id: "${entityId}" OR related.entity: "${entityId}"`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
