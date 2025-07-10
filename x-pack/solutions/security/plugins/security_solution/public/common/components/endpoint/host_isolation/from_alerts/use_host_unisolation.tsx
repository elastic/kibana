/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { useAppToasts } from '../../../../hooks/use_app_toasts';
import { HOST_ISOLATION_FAILURE } from '../../../../../detections/containers/detection_engine/alerts/translations';
import { createHostUnIsolation } from '../../../../../detections/containers/detection_engine/alerts/api';

interface HostUnisolationStatus {
  loading: boolean;
  unIsolateHost: () => Promise<boolean>;
}

interface UseHostIsolationProps {
  endpointId: string;
  comment: string;
  caseIds?: string[];
  agentType: ResponseActionAgentType;
}

export const useHostUnisolation = ({
  endpointId,
  comment,
  caseIds,
  agentType,
}: UseHostIsolationProps): HostUnisolationStatus => {
  const [loading, setLoading] = useState(false);
  const { addError } = useAppToasts();

  const unIsolateHost = useCallback(async () => {
    try {
      setLoading(true);
      const isolationStatus = await createHostUnIsolation({
        endpointId,
        comment,
        caseIds: caseIds && caseIds.length > 0 ? caseIds : undefined,
        agentType,
      });
      setLoading(false);
      return isolationStatus.action ? true : false;
    } catch (error) {
      setLoading(false);
      addError(error, { title: HOST_ISOLATION_FAILURE });
      return false;
    }
  }, [endpointId, comment, caseIds, agentType, addError]);
  return { loading, unIsolateHost };
};
