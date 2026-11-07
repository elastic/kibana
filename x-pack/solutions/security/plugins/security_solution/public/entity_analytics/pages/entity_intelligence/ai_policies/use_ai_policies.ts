/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import {
  AI_POLICIES_URL,
  AI_POLICY_STATUS_URL,
} from '../../../../../common/entity_intelligence/ai_policies';
import type {
  AiPoliciesResponse,
  AiPolicy,
  AiPolicyInput,
  AiPolicyDetectorStatusResponse,
} from '../../../../../common/entity_intelligence/ai_policies';

interface PolicyHttpError extends Error {
  body?: { statusCode?: number; message?: string };
  response?: { status?: number };
}

export const policySaveError = (error: PolicyHttpError): string => {
  const status = error.body?.statusCode ?? error.response?.status;
  if (status === 409)
    return i18n.translate('xpack.securitySolution.entityIntelligence.policies.error.conflict', {
      defaultMessage:
        'This policy changed while you were editing. Close the editor, refresh the policies, and reopen the latest revision. Your changes have not been saved.',
    });
  if (status === 403)
    return i18n.translate('xpack.securitySolution.entityIntelligence.policies.error.forbidden', {
      defaultMessage: 'You need Entity Analytics management privileges to save policies.',
    });
  return (
    error.body?.message ??
    i18n.translate('xpack.securitySolution.entityIntelligence.policies.error.save', {
      defaultMessage: 'The policy could not be saved. Try again.',
    })
  );
};

/** Loads policies and collector reports independently so missing telemetry does not hide configuration. */
export const useAiPolicies = () => {
  const { http } = useKibana().services;
  const spaceId = useSpaceId();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const policies = useQuery<AiPoliciesResponse>(
    ['entityIntelligenceAiPolicies', spaceId],
    ({ signal }) => http.get(AI_POLICIES_URL, { signal, version: API_VERSIONS.internal.v1 }),
    { enabled: Boolean(spaceId), retry: false, refetchOnWindowFocus: false }
  );
  const detector = useQuery<AiPolicyDetectorStatusResponse>(
    ['entityIntelligenceAiPolicyDetector', spaceId],
    ({ signal }) => http.get(AI_POLICY_STATUS_URL, { signal, version: API_VERSIONS.internal.v1 }),
    { enabled: Boolean(spaceId), retry: false, refetchOnWindowFocus: false, refetchInterval: 15000 }
  );
  const save = async (input: AiPolicyInput, existing?: AiPolicy): Promise<boolean> => {
    setSaveError(undefined);
    setIsSaving(true);
    try {
      if (existing) {
        await http.put(`${AI_POLICIES_URL}/${encodeURIComponent(existing.id)}`, {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({ ...input, expectedVersion: existing.version }),
        });
      } else {
        await http.post(AI_POLICIES_URL, {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify(input),
        });
      }
      await policies.refetch();
      return true;
    } catch (error) {
      setSaveError(policySaveError(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  return {
    policies: policies.isError ? [] : policies.data?.policies ?? [],
    total: policies.isError ? undefined : policies.data?.total,
    isLoading: policies.isLoading,
    isRefreshing: policies.isRefetching,
    unavailable: policies.isError,
    detector: detector.isError ? undefined : detector.data,
    detectorLoading: detector.isLoading,
    detectorUnavailable: detector.isError,
    save,
    isSaving,
    saveError,
    clearSaveError: () => setSaveError(undefined),
    refresh: () => {
      void policies.refetch();
      void detector.refetch();
    },
  };
};
