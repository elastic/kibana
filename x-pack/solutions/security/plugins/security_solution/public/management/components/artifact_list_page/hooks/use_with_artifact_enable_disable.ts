/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useToasts } from '../../../../common/lib/kibana';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { useUpdateArtifact } from '../../../hooks/artifacts';
import {
  addDisabledArtifactTag,
  removeDisabledArtifactTag,
} from '../../../../../common/endpoint/service/artifacts';

export const ARTIFACT_ENABLE_DISABLE_ACTION_LABELS = Object.freeze({
  enableActionSuccess: (itemName: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.enableActionSuccess', {
      defaultMessage: '"{itemName}" enabled',
      values: { itemName },
    }),
  disableActionSuccess: (itemName: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.disableActionSuccess', {
      defaultMessage: '"{itemName}" disabled',
      values: { itemName },
    }),
  enableDisableActionFailure: (itemName: string, errorMessage: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.enableDisableActionFailure', {
      defaultMessage: 'Unable to update "{itemName}". Reason: {errorMessage}',
      values: { itemName, errorMessage },
    }),
});

export const useWithArtifactEnableDisable = (
  apiClient: ExceptionsListApiClient,
  item: ExceptionListItemSchema,
  labels: typeof ARTIFACT_ENABLE_DISABLE_ACTION_LABELS
) => {
  const toasts = useToasts();
  const { mutateAsync, isLoading } = useUpdateArtifact(apiClient, { retry: false });

  const setArtifactEnabled = useCallback(
    async (enabled: boolean): Promise<ExceptionListItemSchema> => {
      const tags = enabled
        ? removeDisabledArtifactTag(item.tags ?? [])
        : addDisabledArtifactTag(item.tags ?? []);

      try {
        const updatedItem = await mutateAsync({ ...item, tags });
        toasts.addSuccess(
          enabled
            ? labels.enableActionSuccess(updatedItem.name)
            : labels.disableActionSuccess(updatedItem.name)
        );
        return updatedItem;
      } catch (error) {
        const httpError = error as IHttpFetchError<Error>;
        toasts.addDanger(
          labels.enableDisableActionFailure(item.name, httpError.body?.message || httpError.message)
        );
        throw error;
      }
    },
    [item, labels, mutateAsync, toasts]
  );

  return useMemo(
    () => ({
      setArtifactEnabled,
      isLoading,
    }),
    [isLoading, setArtifactEnabled]
  );
};
