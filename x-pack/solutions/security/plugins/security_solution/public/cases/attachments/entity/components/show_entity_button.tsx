/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { TimelineId } from '../../../../../common/types/timeline';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import type { EntityType } from '../../../../../common/entity_analytics/types';

const SHOW_ENTITY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.cases.showEntityDetails',
  { defaultMessage: 'Show entity details' }
);

export interface ShowEntityButtonProps {
  id: string;
  entityId: string;
  entityName: string;
  entityType: string;
}

export const ShowEntityButton = ({
  id,
  entityId,
  entityName,
  entityType,
}: ShowEntityButtonProps) => {
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openEntityFlyout } = useFlyoutApi();
  const { openFlyout } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    if (enableNewFlyout) {
      openEntityFlyout({
        engineType: entityType,
        entityId,
        entityName,
        scopeId: TimelineId.casePage,
        origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      });
    } else {
      // Legacy expandable flyout path. No telemetry here — the new-flyout path reports
      // telemetry internally via openEntityFlyout, and the legacy path is being deprecated.
      const panelKey = EntityPanelKeyByType[entityType as EntityType];
      const paramName = EntityPanelParamByType[entityType as EntityType];
      if (panelKey && paramName) {
        openFlyout({
          right: {
            id: panelKey,
            params: { [paramName]: entityName, entityId, scopeId: TimelineId.casePage },
          },
        });
      }
    }
  }, [enableNewFlyout, entityId, entityName, entityType, openEntityFlyout, openFlyout]);

  return (
    <EuiToolTip position="top" content={<p>{SHOW_ENTITY_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={SHOW_ENTITY_TOOLTIP}
        data-test-subj={`comment-action-show-entity-${id}`}
        onClick={onClick}
        iconType="chevronSingleRight"
        id={`${id}-show-entity`}
      />
    </EuiToolTip>
  );
};

ShowEntityButton.displayName = 'ShowEntityButton';
