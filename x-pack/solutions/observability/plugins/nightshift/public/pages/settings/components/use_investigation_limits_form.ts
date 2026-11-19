/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { InvestigationQuotaGroup } from '@kbn/nightshift-investigations-plugin/common';
import {
  useInvestigationQuotas,
  useUpdateInvestigationQuotas,
} from '../../../data/run_quotas/use_investigation_quotas';
import {
  buildInvestigationQuotaUpdate,
  createInvestigationQuotaDraftState,
  hasInvestigationQuotaDraftChanges,
  INVESTIGATION_QUOTA_GROUPS,
  isLowerFiniteLimit,
  keepRestoreLimits,
  setInvestigationQuotaEnabled,
  type InvestigationLimitDraft,
  type InvestigationQuotaDraftState,
} from './investigation_limit_draft';

export type InvestigationLimitSaveRequestResult =
  | 'saved'
  | 'needs-confirmation'
  | 'failed'
  | 'noop';
export type InvestigationLimitConfirmedSaveResult = 'saved' | 'failed';

export const useInvestigationLimitsForm = () => {
  const quotas = useInvestigationQuotas();
  const { save, isSaving } = useUpdateInvestigationQuotas();
  const [draftState, setDraftState] = useState<InvestigationQuotaDraftState>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveError, setSaveError] = useState<Error>();

  // A background refetch must not replace what the user is editing.
  useEffect(() => {
    if (!quotas.data) {
      return;
    }
    setDraftState((current) =>
      current && hasInvestigationQuotaDraftChanges(current)
        ? current
        : keepRestoreLimits(createInvestigationQuotaDraftState(quotas.data), current)
    );
  }, [quotas.data]);

  const update = useMemo(
    () => (draftState ? buildInvestigationQuotaUpdate(draftState) : undefined),
    [draftState]
  );

  // Lowering a limit to a value that today's count has already reached blocks starts right away.
  const loweringGroups = useMemo<InvestigationQuotaGroup[]>(() => {
    if (!draftState || !quotas.data) {
      return [];
    }
    const { counts } = quotas.data;
    return INVESTIGATION_QUOTA_GROUPS.filter((group) => {
      const next = draftState.draft.limits[group];
      return isLowerFiniteLimit(draftState.saved.limits[group], next) && counts[group] >= next;
    });
  }, [draftState, quotas.data]);

  const performSave = useCallback(async (): Promise<InvestigationLimitConfirmedSaveResult> => {
    if (!update) {
      return 'saved';
    }

    setSaveError(undefined);
    try {
      const response = await save(update);
      setDraftState((current) =>
        keepRestoreLimits(createInvestigationQuotaDraftState(response), current)
      );
      setShowConfirmation(false);
      return 'saved';
    } catch (error) {
      setShowConfirmation(false);
      setSaveError(error instanceof Error ? error : new Error(String(error)));
      return 'failed';
    }
  }, [save, update]);

  const requestSave = useCallback(async (): Promise<InvestigationLimitSaveRequestResult> => {
    if (!update) {
      return 'noop';
    }
    if (loweringGroups.length > 0) {
      setShowConfirmation(true);
      return 'needs-confirmation';
    }
    return performSave();
  }, [performSave, update, loweringGroups]);

  const updateLimitDraft = useCallback(
    (group: InvestigationQuotaGroup, limit: InvestigationLimitDraft) => {
      setSaveError(undefined);
      setDraftState((current) =>
        current
          ? {
              ...current,
              draft: { ...current.draft, limits: { ...current.draft.limits, [group]: limit } },
            }
          : current
      );
    },
    []
  );

  const setEnabled = useCallback((enabled: boolean) => {
    setSaveError(undefined);
    setDraftState((current) =>
      current ? setInvestigationQuotaEnabled(current, enabled) : current
    );
  }, []);

  const cancel = useCallback(() => {
    const loaded = quotas.data;
    if (loaded) {
      setDraftState((current) =>
        keepRestoreLimits(createInvestigationQuotaDraftState(loaded), current)
      );
    }
    setSaveError(undefined);
    setShowConfirmation(false);
  }, [quotas.data]);

  return {
    quotas,
    draftState,
    update,
    isDirty: draftState ? hasInvestigationQuotaDraftChanges(draftState) : false,
    isSaving,
    canManage: quotas.data?.canManage === true,
    saveError,
    updateLimitDraft,
    setEnabled,
    cancel,
    requestSave,
    confirmAndSave: performSave,
    showConfirmation,
    confirmationTitle: i18n.translate('xpack.nightshift.settings.runLimits.loweringConfirmTitle', {
      defaultMessage: 'Lower limits to values already reached?',
    }),
    confirmationButtonText: i18n.translate(
      'xpack.nightshift.settings.runLimits.loweringConfirmButtonLabel',
      { defaultMessage: 'Save lower limits' }
    ),
    loweringGroups,
    closeConfirmation: () => setShowConfirmation(false),
  };
};

export type InvestigationLimitsForm = ReturnType<typeof useInvestigationLimitsForm>;
