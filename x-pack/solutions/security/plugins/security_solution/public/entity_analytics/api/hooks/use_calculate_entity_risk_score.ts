/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../api';

export const useCalculateEntityRiskScore = ({
  identifierType,
  identifier,
  entityId,
  onSuccess,
}: {
  identifierType: EntityType;
  identifier: string;
  entityId?: string;
  onSuccess: () => void;
}) => {
  const { addError } = useAppToasts();
  const { calculateEntityRiskScoreV2 } = useEntityAnalyticsRoutes();

  const onError = useCallback(
    (error: unknown) => {
      addError(error, {
        title: i18n.translate('xpack.securitySolution.entityDetails.userPanel.error', {
          defaultMessage: 'There was a problem calculating the {entity} risk score',
          values: { entity: `${identifierType}'s` },
        }),
      });
    },
    [addError, identifierType]
  );

  const { mutate: mutateV2, isLoading } = useMutation(calculateEntityRiskScoreV2, {
    onSuccess,
    onError,
  });

  const calculateEntityRiskScoreCb = useCallback(async () => {
    mutateV2({
      identifier_type: identifierType,
      identifier,
      entity_id: entityId,
    });
  }, [mutateV2, identifierType, identifier, entityId]);

  return {
    isLoading,
    calculateEntityRiskScore: calculateEntityRiskScoreCb,
  };
};
