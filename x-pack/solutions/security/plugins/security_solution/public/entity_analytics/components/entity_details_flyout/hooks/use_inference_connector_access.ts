/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useQuery } from '@kbn/react-query';
import { InferenceConnectorType } from '@kbn/inference-common';
import { INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL } from '../../../../../common/inference_connector/constants';
import { API_VERSIONS } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

export const INFERENCE_CONNECTOR_PRIVILEGES_QUERY_KEY = 'inference-connector-privileges';

interface InferenceConnectorPrivilegesResponse {
  has_all_required: boolean;
}

interface InferenceConnectorAccessConnector {
  id?: string;
  actionTypeId?: string;
  name?: string;
}

const isInferenceApiConnector = (connector?: InferenceConnectorAccessConnector): boolean =>
  connector?.actionTypeId === InferenceConnectorType.Inference;

/**
 * Resolves whether the current user can use the selected connector.
 *
 * `.inference` / Elastic Managed LLM connectors require the `monitor_inference`
 * Elasticsearch cluster privilege. BYO connectors (OpenAI, Bedrock, Gemini, …)
 * do not, so the privilege check is skipped for them.
 */
export const useInferenceConnectorAccess = ({
  connectors,
  selectedConnectorId,
}: {
  connectors?: InferenceConnectorAccessConnector[];
  selectedConnectorId: string;
}) => {
  const { http } = useKibana().services;

  const selectedConnector = useMemo(
    () => connectors?.find((c) => c.id === selectedConnectorId),
    [connectors, selectedConnectorId]
  );
  const isInferenceConnector = isInferenceApiConnector(selectedConnector);

  const fetchInferenceConnectorPrivileges = useCallback(
    () =>
      http.fetch<InferenceConnectorPrivilegesResponse>(
        INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL,
        {
          version: API_VERSIONS.internal.v1,
          method: 'GET',
        }
      ),
    [http]
  );

  const {
    data: privileges,
    isLoading: isCheckingPrivileges,
    isFetched,
    isSuccess,
    isError,
  } = useQuery<InferenceConnectorPrivilegesResponse, SecurityAppError>({
    queryKey: [INFERENCE_CONNECTOR_PRIVILEGES_QUERY_KEY],
    queryFn: fetchInferenceConnectorPrivileges,
    enabled: isInferenceConnector,
    retry: 0,
  });

  const hasInferencePrivilege = privileges?.has_all_required === true;
  // Only treat as a privilege denial when the check succeeded. A failed request
  // (500, timeout, network) must not show the monitor_inference remediation message.
  const missingInferencePrivilege = isInferenceConnector && isSuccess && !hasInferencePrivilege;

  const canUseSelectedConnector = useMemo(() => {
    if (!isInferenceConnector) {
      return true;
    }
    if (isCheckingPrivileges || !isFetched) {
      return false;
    }
    // Privilege check failed — allow Generate so the generation path surfaces its own error
    // rather than incorrectly claiming the user lacks monitor_inference.
    if (isError) {
      return true;
    }
    return hasInferencePrivilege;
  }, [isInferenceConnector, isCheckingPrivileges, isFetched, isError, hasInferencePrivilege]);

  return {
    canUseSelectedConnector,
    isCheckingPrivileges: isInferenceConnector && isCheckingPrivileges,
    missingInferencePrivilege,
  };
};
