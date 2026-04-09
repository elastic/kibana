/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback } from 'react';
import { EntityType } from '../../../../../common/search_strategy';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { useKibana } from '../../../../common/lib/kibana';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { ServiceDetailsPanelKey } from '../../service_details_left';
import { ServicePanelKey } from '../../shared/constants';
import type { IdentityFields } from '../../../document_details/shared/utils';

interface UseNavigateToServiceDetailsParams {
  entityId?: string;
  serviceName: string;
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  identityFields: IdentityFields;
  isPreviewMode: boolean;
  entityStoreEntityId?: string;
}

export const useNavigateToServiceDetails = ({
  entityId,
  serviceName,
  scopeId,
  contextID,
  isRiskScoreExist,
  identityFields,
  isPreviewMode,
  entityStoreEntityId,
}: UseNavigateToServiceDetailsParams): ((path: EntityDetailsPath) => void) => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  return useCallback(
    (path: EntityDetailsPath) => {
      telemetry.reportEvent(EntityEventTypes.RiskInputsExpandedFlyoutOpened, {
        entity: EntityType.service,
      });

      const left = {
        id: ServiceDetailsPanelKey,
        params: {
          isRiskScoreExist,
          identityFields,
          scopeId,
          entityId,
          serviceName,
          entityStoreEntityId,
          path,
        },
      };

      if (isPreviewMode) {
        openFlyout({
          right: {
            id: ServicePanelKey,
            params: {
              contextID,
              scopeId,
              entityId,
              serviceName,
            },
          },
          left,
        });
      } else {
        openLeftPanel(left);
      }
    },
    [
      isRiskScoreExist,
      identityFields,
      openLeftPanel,
      openFlyout,
      scopeId,
      entityId,
      serviceName,
      contextID,
      isPreviewMode,
      entityStoreEntityId,
      telemetry,
    ]
  );
};
