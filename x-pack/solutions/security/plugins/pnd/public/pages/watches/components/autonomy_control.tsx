/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  isGateAutoAcceptable,
  PND_GATE_REGISTRY,
  WATCH_AUTONOMY_LEVELS,
  type PndGateDefinition,
  type Watch,
  type WatchAutonomyLevel,
} from '@kbn/pnd-common';
import { isManagedWatchId } from '../../../hooks/is_managed_watch_id';
import {
  useAutonomy,
  useAutoRespondToProposals,
  useSetAutonomy,
} from '../../../hooks/use_autonomy_api';
import { useCanManageAutonomy } from '../../../hooks/use_can_manage_autonomy';
import { getErrorMessage, PndQueryState } from '../../../states';
import { AutonomySlider } from './autonomy_slider';
import * as i18n from '../translations';
import * as settingsI18n from '../settings_translations';

interface AutonomyControlProps {
  watch: Watch;
}

/**
 * The autonomy dial — the one control on watch detail that persists.
 *
 * `AutonomySlider` renders the shared {@link WATCH_AUTONOMY_LEVELS} scale; everything around it here
 * is what makes the dial real rather than presentational.
 *
 * Three things it deliberately does NOT do:
 *
 * 1. **It never reads or mirrors the level off the watch projection.** There is no
 *    `Watch.autonomyLevel` any more, and that is the point: the gates read the
 *    `pnd:autonomy:<watchId>` uiSetting that `GET /internal/pnd/autonomy` serves, so a second copy on
 *    the projection could only ever disagree with the one that decides what happens. This is also why
 *    the applied level is not echoed back through `PATCH /internal/pnd/watches/{watchId}`: that route
 *    now rejects `autonomyLevel`, because it carries `pnd_write` rather than the
 *    `pnd_manage_autonomy` privilege `PUT /internal/pnd/autonomy` is gated on.
 * 2. **It never pretends the level changed.** Without `pnd_manage_autonomy` the slider is disabled
 *    and says why: that privilege is `includeIn: 'none'` and is not part of PND `all`, so read-only
 *    is the ordinary case, not an error.
 * 3. **It never implies a raise took effect on live runs.** A raise cannot retroactively resume a
 *    gate that is already waiting, so after a successful raise it offers `_auto_respond`
 *    (`origin: 'dial'`) instead of leaving the queue looking stale.
 */
export const AutonomyControl: React.FC<AutonomyControlProps> = ({ watch }) => {
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  // announces the sweep dialog by its own heading (@elastic/eui/require-aria-label-for-modals)
  const sweepPromptTitleId = useGeneratedHtmlId();

  const canManageAutonomy = useCanManageAutonomy();
  const isManaged = isManagedWatchId(watch.id);
  const { data, error, isLoading, refetch } = useAutonomy(watch.id);
  const setAutonomy = useSetAutonomy();
  const autoRespondToProposals = useAutoRespondToProposals();

  const [pendingLevel, setPendingLevel] = useState<WatchAutonomyLevel | null>(null);
  const [isSweepPromptOpen, setIsSweepPromptOpen] = useState(false);

  // a different watch is a different dial: never carry an unapplied edit across
  useEffect(() => {
    setPendingLevel(null);
    setIsSweepPromptOpen(false);
  }, [watch.id]);

  const persistedLevel = data?.autonomyLevel;
  const displayedLevel = pendingLevel ?? persistedLevel ?? WATCH_AUTONOMY_LEVELS[0];

  const gates = useMemo<PndGateDefinition[]>(
    () => PND_GATE_REGISTRY.filter((gate) => gate.workflowId === watch.id),
    [watch.id]
  );

  const onLevelChange = useCallback(
    (next: WatchAutonomyLevel) => {
      // back at the persisted level is not a pending change
      setPendingLevel(next === persistedLevel ? null : next);
    },
    [persistedLevel]
  );

  const onApply = useCallback(async () => {
    if (pendingLevel == null || persistedLevel == null) {
      return;
    }

    try {
      const persisted = await setAutonomy.mutateAsync({
        autonomyLevel: pendingLevel,
        watchId: watch.id,
      });

      setPendingLevel(null);
      toasts?.addSuccess(
        i18n.autonomySavedToast(settingsI18n.autonomyLevelName(persisted.autonomyLevel))
      );

      // only a raise can newly auto-accept anything, so only a raise offers the sweep
      const isRaise =
        WATCH_AUTONOMY_LEVELS.indexOf(persisted.autonomyLevel) >
        WATCH_AUTONOMY_LEVELS.indexOf(persistedLevel);
      if (isRaise) {
        setIsSweepPromptOpen(true);
      }
    } catch (saveError) {
      toasts?.addDanger({
        text: getErrorMessage(saveError, i18n.AUTONOMY_SAVE_FAILED_FALLBACK),
        title: i18n.AUTONOMY_SAVE_FAILED,
      });
    }
  }, [pendingLevel, persistedLevel, setAutonomy, toasts, watch.id]);

  const onConfirmSweep = useCallback(async () => {
    try {
      const { approved, skipped } = await autoRespondToProposals.mutateAsync({
        origin: 'dial',
        watchId: watch.id,
      });

      toasts?.addSuccess(i18n.sweepResultToast(approved, skipped));
    } catch (sweepError) {
      toasts?.addDanger({
        text: getErrorMessage(sweepError, i18n.SWEEP_FAILED_FALLBACK),
        title: i18n.SWEEP_FAILED,
      });
    } finally {
      setIsSweepPromptOpen(false);
    }
  }, [autoRespondToProposals, toasts, watch.id]);

  /**
   * Steady state reads the server's own `autoAccept` map (fail-closed: a key the
   * watch does not own is absent, and absent means "gated"). While an edit is
   * pending it previews the same decision locally with the identical pure
   * function the route uses, so the badges never disagree with what applying
   * would do.
   */
  const isAutoAccepted = useCallback(
    (gate: PndGateDefinition): boolean =>
      pendingLevel == null
        ? data?.autoAccept[gate.gateId] === true
        : isGateAutoAcceptable(gate.workflowId, gate.stepId, pendingLevel),
    [data?.autoAccept, pendingLevel]
  );

  // Only managed catalog watches persist a level, so a custom watch has no dial to show.
  if (!isManaged) {
    return (
      <EuiText color="subdued" data-test-subj="pndAutonomyUnmanagedNote" size="xs">
        {i18n.AUTONOMY_UNMANAGED_NOTE}
      </EuiText>
    );
  }

  return (
    <>
      <PndQueryState
        emptyTitle={i18n.AUTONOMY_UNAVAILABLE_TITLE}
        error={error}
        isEmpty={false}
        isLoading={isLoading}
        loadingLabel={i18n.AUTONOMY_LOADING}
        onRetry={() => {
          void refetch();
        }}
      >
        <AutonomySlider
          current={displayedLevel}
          isDisabled={!canManageAutonomy}
          onChange={onLevelChange}
        />

        {pendingLevel != null ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="pndAutonomyApply"
                  fill
                  isLoading={setAutonomy.isLoading}
                  onClick={onApply}
                  size="s"
                >
                  {i18n.AUTONOMY_APPLY}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="pndAutonomyDiscard"
                  onClick={() => setPendingLevel(null)}
                  size="s"
                >
                  {i18n.AUTONOMY_DISCARD}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null}

        {gates.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiText color="subdued" size="xs">
              {pendingLevel == null ? i18n.AUTONOMY_AT_THIS_LEVEL : i18n.AUTONOMY_AT_PENDING_LEVEL}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {gates.map((gate) => (
                <EuiFlexItem grow={false} key={gate.gateId}>
                  <EuiBadge
                    color={isAutoAccepted(gate) ? 'success' : 'hollow'}
                    data-test-subj={`pndAutonomyGateFlag-${gate.gateId}`}
                  >
                    {i18n.gateAutoAcceptLabel(gate.gateId, isAutoAccepted(gate))}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}

        {!canManageAutonomy ? (
          <>
            <EuiSpacer size="m" />
            <EuiText color="subdued" data-test-subj="pndAutonomyReadOnlyNote" size="xs">
              {i18n.AUTONOMY_READ_ONLY_NOTE}
            </EuiText>
          </>
        ) : null}
      </PndQueryState>

      {isSweepPromptOpen ? (
        <EuiConfirmModal
          aria-labelledby={sweepPromptTitleId}
          buttonColor="warning"
          cancelButtonText={i18n.SWEEP_CANCEL}
          confirmButtonText={i18n.SWEEP_CONFIRM}
          data-test-subj="pndAutonomySweepPrompt"
          confirmButtonDisabled={autoRespondToProposals.isLoading}
          isLoading={autoRespondToProposals.isLoading}
          onCancel={() => setIsSweepPromptOpen(false)}
          onConfirm={onConfirmSweep}
          title={i18n.SWEEP_TITLE}
          titleProps={{ id: sweepPromptTitleId }}
        >
          <EuiText size="s">
            <p>{i18n.SWEEP_BODY}</p>
            <p>{i18n.SWEEP_ALWAYS_GATE_NOTE}</p>
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
