/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiLink, EuiPanel } from '@elastic/eui';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { i18n } from '@kbn/i18n';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import { useFlyoutApi } from '@kbn/flyout';
import { TakeAction } from '../shared/components/take_action';
import {
  GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ,
  GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ,
} from './constants';
import { GenericEntityPanelKey } from '../shared/constants';
import { GENERIC_ENTITY_PREVIEW_BANNER } from '../../document_details/preview/constants';
import { ASK_AI_ASSISTANT } from '../shared/translations';
import { useAssetInventoryAssistant } from './hooks/use_asset_inventory_assistant';
import type { AssetCriticalityLevel } from '../../../../common/api/entity_analytics/asset_criticality';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';

interface GenericEntityFlyoutFooterProps {
  entityId: EntityEcs['id'];
  isChild: boolean;
  scopeId: string;
  entityFields: Record<string, string[]>;
  assetCriticalityLevel?: AssetCriticalityLevel;
}

export const GenericEntityFlyoutFooter = ({
  entityId,
  isChild,
  scopeId,
  entityFields,
  assetCriticalityLevel,
}: GenericEntityFlyoutFooterProps) => {
  const { openFlyout } = useFlyoutApi();

  const { showAssistant, showAssistantOverlay } = useAssetInventoryAssistant({
    entityId,
    entityFields,
    isChild,
    assetCriticalityLevel,
  });

  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const openDocumentFlyout = useCallback(() => {
    openFlyout({
      main: {
        id: GenericEntityPanelKey,
        params: {
          scopeId,
          entityId,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isChild: false,
        },
      },
    });
  }, [scopeId, entityId, openFlyout]);

  const fullDetailsLink = useMemo(
    () => (
      <EuiLink
        onClick={openDocumentFlyout}
        target="_blank"
        data-test-subj={GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ}
      >
        {i18n.translate('xpack.securitySolution.flyout.preview.genericEntityFullDetails', {
          defaultMessage: 'Show full entity details',
        })}
      </EuiLink>
    ),
    [openDocumentFlyout]
  );

  return (
    <EuiFlyoutFooter data-test-subj={GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ}>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {isChild && <EuiFlexItem grow={false}>{fullDetailsLink}</EuiFlexItem>}

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
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
