/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback, useMemo } from 'react';
import { EntityType } from '../../../../../common/search_strategy';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import type { IdentityFields } from '../../../document_details/shared/utils';
import { useKibana } from '../../../../common/lib/kibana';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { ServiceDetailsPanelKey } from '../../service_details_left';

interface UseNavigateToServiceDetailsParams {
  identityFields: IdentityFields;
  scopeId: string;
  isRiskScoreExist: boolean;
}

export const useNavigateToServiceDetails = ({
  identityFields,
  scopeId,
  isRiskScoreExist,
}: UseNavigateToServiceDetailsParams): ((path: EntityDetailsPath) => void) => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const safeEntityIdentifiers = useMemo(() => identityFields ?? {}, [identityFields]);

  return useCallback(
    (path: EntityDetailsPath) => {
      telemetry.reportEvent(EntityEventTypes.RiskInputsExpandedFlyoutOpened, {
        entity: EntityType.service,
      });

      openLeftPanel({
        id: ServiceDetailsPanelKey,
        params: {
          isRiskScoreExist,
          scopeId,
          identityFields: safeEntityIdentifiers,
          path,
        },
      });
    },
    [isRiskScoreExist, openLeftPanel, scopeId, safeEntityIdentifiers, telemetry]
  );
};
