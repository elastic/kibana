/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useUpdateRunQuotas,
} from '../../../data/run_quotas/use_significant_events_run_quotas';
import {
  buildRunQuotaSettingsUpdate,
  createRunQuotaDraftState,
  hasRunQuotaDraftChanges,
  isLowerFiniteLimit,
  keepRestoreLimits,
  setInvestigationLimitsEnabled,
  setRunLimitEnabled,
  withEmptyLimitsAsUnlimited,
  type RunLimitDraft,
  type RunQuotaDraftState,
} from './run_limit_draft';

export interface RunLimitSaveWarnings {
  loweringGroups: RunQuotaGroup[];
}

export type RunLimitSaveRequestResult = 'saved' | 'needs-confirmation' | 'failed' | 'noop';
export type RunLimitConfirmedSaveResult = 'saved' | 'failed';

const hasSaveWarnings = ({ loweringGroups }: RunLimitSaveWarnings): boolean =>
  loweringGroups.length > 0;

export const useRunLimitsForm = ({
  groups,
  sharedSwitch = false,
}: {
  groups: readonly RunQuotaGroup[];
  /** One switch turns the investigation limits on or off, and an empty input means no limit. */
  sharedSwitch?: boolean;
}) => {
  const quotas = useRunQuotas();
  const { save, isSaving } = useUpdateRunQuotas();
  const [draftState, setDraftState] = useState<RunQuotaDraftState>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveError, setSaveError] = useState<Error>();

  useEffect(() => {
    if (!quotas.data) {
      return;
    }
    setDraftState((current) =>
      current &&
      hasRunQuotaDraftChanges(sharedSwitch ? withEmptyLimitsAsUnlimited(current) : current)
        ? current
        : keepRestoreLimits(createRunQuotaDraftState(quotas.data), current)
    );
  }, [quotas.data, sharedSwitch]);

  // What a save sends: with the shared switch, an input left empty is a limit turned off.
  const effectiveDraftState = useMemo(
    () => (draftState && sharedSwitch ? withEmptyLimitsAsUnlimited(draftState) : draftState),
    [draftState, sharedSwitch]
  );

  const update = useMemo(
    () => (effectiveDraftState ? buildRunQuotaSettingsUpdate(effectiveDraftState) : undefined),
    [effectiveDraftState]
  );

  const warnings = useMemo<RunLimitSaveWarnings>(() => {
    if (!effectiveDraftState || !quotas.data) {
      return {
        loweringGroups: [],
      };
    }
    const response = quotas.data;
    const loweringGroups = groups.filter((group) => {
      const next = effectiveDraftState.draft.limits[group];
      return (
        next !== effectiveDraftState.saved.limits[group] &&
        isLowerFiniteLimit(effectiveDraftState.saved.limits[group], next) &&
        response.counts[group] >= next
      );
    });

    return {
      loweringGroups,
    };
  }, [effectiveDraftState, groups, quotas.data]);

  const performSave = useCallback(async (): Promise<RunLimitConfirmedSaveResult> => {
    if (!update) {
      return 'saved';
    }

    setSaveError(undefined);
    try {
      const response = await save(update);
      setDraftState((current) => keepRestoreLimits(createRunQuotaDraftState(response), current));
      setShowConfirmation(false);
      return 'saved';
    } catch (error) {
      setShowConfirmation(false);
      setSaveError(error instanceof Error ? error : new Error(String(error)));
      return 'failed';
    }
  }, [save, update]);

  const requestSave = useCallback(async (): Promise<RunLimitSaveRequestResult> => {
    if (!update) {
      return 'noop';
    }
    if (hasSaveWarnings(warnings)) {
      setShowConfirmation(true);
      return 'needs-confirmation';
    }
    return performSave();
  }, [performSave, update, warnings]);

  const confirmAndSave = useCallback(
    async (): Promise<RunLimitConfirmedSaveResult> => performSave(),
    [performSave]
  );

  const updateLimitDraft = useCallback((group: RunQuotaGroup, limit: RunLimitDraft) => {
    setSaveError(undefined);
    setDraftState((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              limits: {
                ...current.draft.limits,
                [group]: limit,
              },
            },
          }
        : current
    );
  }, []);

  const setInvestigationLimitsOn = useCallback((enabled: boolean) => {
    setSaveError(undefined);
    setDraftState((current) =>
      current ? setInvestigationLimitsEnabled(current, enabled) : current
    );
  }, []);

  const setLimitEnabled = useCallback((group: RunQuotaGroup, enabled: boolean) => {
    setSaveError(undefined);
    setDraftState((current) => (current ? setRunLimitEnabled(current, group, enabled) : current));
  }, []);

  const cancel = useCallback(() => {
    const loaded = quotas.data;
    if (loaded) {
      setDraftState((current) => keepRestoreLimits(createRunQuotaDraftState(loaded), current));
    }
    setSaveError(undefined);
    setShowConfirmation(false);
  }, [quotas.data]);

  const confirmationTitle = i18n.translate(
    'xpack.nightshift.settings.runLimits.loweringConfirmTitle',
    {
      defaultMessage: 'Lower limits to values already reached?',
    }
  );

  const confirmationButtonText = i18n.translate(
    'xpack.nightshift.settings.runLimits.loweringConfirmButtonLabel',
    {
      defaultMessage: 'Save lower limits',
    }
  );

  return {
    quotas,
    draftState,
    update,
    isDirty: effectiveDraftState ? hasRunQuotaDraftChanges(effectiveDraftState) : false,
    sharedSwitch,
    isSaving,
    canManage: quotas.data?.canManage === true,
    saveError,
    updateLimitDraft,
    setLimitEnabled,
    setInvestigationLimitsEnabled: setInvestigationLimitsOn,
    cancel,
    requestSave,
    confirmAndSave,
    showConfirmation,
    confirmationTitle,
    confirmationButtonText,
    warnings,
    closeConfirmation: () => setShowConfirmation(false),
  };
};

export type RunLimitsForm = ReturnType<typeof useRunLimitsForm>;
