/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPanelProps } from '@elastic/eui';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import { TakeAction } from '../shared/components/take_action';
import { GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ } from './constants';
import { ASK_AI_ASSISTANT } from '../shared/translations';
import { useAssetInventoryAssistant } from './hooks/use_asset_inventory_assistant';
import type { AssetCriticalityLevel } from '../../../../common/api/entity_analytics/asset_criticality';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';

interface GenericEntityFlyoutFooterProps {
  entityId: EntityEcs['id'];
  entityFields: Record<string, string[]>;
  assetCriticalityLevel?: AssetCriticalityLevel;
  /**
   * Overrides forwarded to the outer `EuiFlyoutFooter` (e.g. `css` for compact spacing in the EUI
   * system flyout). Legacy callers omit this and keep the default.
   */
  flyoutFooterProps?: React.ComponentProps<typeof EuiFlyoutFooter>;
  /**
   * Overrides for the inner padding wrapper (e.g. `{ paddingSize: 'none' }`). Legacy callers omit this.
   */
  panelProps?: Pick<EuiPanelProps, 'paddingSize' | 'css'>;
}

export const GenericEntityFlyoutFooter = ({
  entityId,
  entityFields,
  assetCriticalityLevel,
  flyoutFooterProps,
  panelProps,
}: GenericEntityFlyoutFooterProps) => {
  useExpandableFlyoutApi();

  const { showAssistant, showAssistantOverlay } = useAssetInventoryAssistant({
    entityId,
    entityFields,
    isPreviewMode: false,
    assetCriticalityLevel,
  });

  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const { euiTheme } = useEuiTheme();
  const paddingSize = panelProps?.paddingSize ?? 'm';

  return (
    <EuiFlyoutFooter data-test-subj={GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ} {...flyoutFooterProps}>
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="center"
        css={[
          paddingSize !== 'none' &&
            css`
              padding: ${euiTheme.size[paddingSize]};
            `,
          panelProps?.css,
        ]}
      >
        {showAssistant && !isAgentChatExperienceEnabled && (
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
    </EuiFlyoutFooter>
  );
};
