/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { Worker } from '@kbn/alertzero-common';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useCanWriteAlertZero } from '../../hooks/use_can_write_alertzero';
import { useWatchSettingsDraft } from '../../hooks/use_watch_settings_draft';
import { useWatch } from '../../hooks/use_watches_api';
import { useWorkers } from '../../hooks/use_workers_api';
import { classifyError, useReportErrorShown } from '../../telemetry';
import { WatchesSectionLayout } from './components/watches_section_layout';
import { WorkerSettingsPanel } from './components/worker_settings_panel';
import {
  getBlockedAfterSaveNotices,
  getDisableConfirmation,
  getWorkerWarningReasons,
  type WorkerBlockedNotice,
  type WorkerDisableConfirmation,
  type WorkerEnabledById,
} from './worker_dependencies/worker_dependencies';
import { WorkerBlockedAfterSaveModal } from './worker_dependencies/worker_blocked_after_save_modal';
import { WorkerDisableConfirmModal } from './worker_dependencies/worker_disable_confirm_modal';
import { workerName } from './workers/translations';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';

const getSaveTooltip = (canWrite: boolean, hasUnsavedChanges: boolean): string | undefined => {
  if (!canWrite) {
    return settingsI18n.READ_ONLY_TOOLTIP;
  }
  return hasUnsavedChanges ? undefined : settingsI18n.NO_CHANGES_TO_SAVE_TOOLTIP;
};

export const WatchDetailPage: React.FC = () => {
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const currentWatchId = useRef(watchId);
  currentWatchId.current = watchId;
  const canWriteAlertZero = useCanWriteAlertZero();
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, isFetching, error, refetch } = useWatch(watchId);
  const {
    data: workersData,
    isLoading: workersLoading,
    isFetching: workersFetching,
    error: workersError,
    refetch: refetchWorkers,
  } = useWorkers();

  const watch = data?.watch;
  useAlertZeroDocTitle(watch?.name ?? i18n.PAGE_TITLE);
  // Absent until the workers response arrives. A loaded response without the flag stays editable
  // only when the field is missing; an explicit false locks the controls.
  const canModifyWorkers = workersData?.canModifyWorkers !== false;
  const canWrite = canWriteAlertZero && canModifyWorkers;

  const members = useMemo(
    () => (workersData?.workers ?? []).filter((worker) => worker.watchIds.includes(watchId)),
    [workersData?.workers, watchId]
  );
  const { discard, dirtyWorkers, isDirty, isSaving, resolve, save, updateEnabled, updateSettings } =
    useWatchSettingsDraft(members);
  const {
    services: {
      application: { navigateToUrl },
      http,
      overlays: { openConfirm },
      appParams: { history: scopedHistory },
    },
  } = useKibana<CoreStart & { appParams: { history: ScopedHistory } }>();
  // Dependencies cross Watches, so this spans every Worker.
  const enabledById: WorkerEnabledById = useMemo(
    () =>
      new Map((workersData?.workers ?? []).map((worker) => [worker.id, resolve(worker).enabled])),
    [workersData?.workers, resolve]
  );
  const [pendingDisable, setPendingDisable] = useState<{
    worker: Worker;
    confirmation: WorkerDisableConfirmation;
  } | null>(null);
  const [blockedNoticeQueue, setBlockedNoticeQueue] = useState<WorkerBlockedNotice[]>([]);
  const [saveBlockedByInvalidDraft, setSaveBlockedByInvalidDraft] = useState(false);
  // Workers whose trigger control holds an uncommittable amount. That draft never reaches settings
  // state, so the page must hear about it directly or Save would persist the last valid cadence.
  const [invalidTriggerWorkerIds, setInvalidTriggerWorkerIds] = useState<Set<string>>(
    () => new Set()
  );
  // Bumped on Discard so trigger controls drop a flagged draft that no longer has anything behind it.
  const [draftResetKey, setDraftResetKey] = useState(0);
  const hasInvalidDraft = invalidTriggerWorkerIds.size > 0;
  // A flagged trigger amount is not part of the draft but is still lost on leave or Discard.
  const hasUnsavedChanges = isDirty || hasInvalidDraft;

  // The browser's native prompt covers closing the tab; this also guards in-app navigation, which
  // includes switching Watch in the sidebar. It stays on during Save: Workers save one by one and
  // a draft clears only once its request succeeds.
  useUnsavedChangesPrompt({
    hasUnsavedChanges,
    http,
    history: scopedHistory,
    navigateToUrl,
    openConfirm,
    titleText: settingsI18n.LEAVE_PROMPT_TITLE,
    messageText: settingsI18n.LEAVE_PROMPT_DESCRIPTION,
    cancelButtonText: settingsI18n.KEEP_EDITING_BUTTON_LABEL,
    confirmButtonText: settingsI18n.LEAVE_PROMPT_CONFIRM_BUTTON_LABEL,
  });

  const handleTriggerValidityChange = useCallback((workerId: string, isValid: boolean) => {
    setInvalidTriggerWorkerIds((current) => {
      if (isValid === !current.has(workerId)) {
        return current;
      }
      const next = new Set(current);
      if (isValid) {
        next.delete(workerId);
      } else {
        next.add(workerId);
      }
      return next;
    });
  }, []);

  const onSave = useCallback(async () => {
    // `save()` cannot see the flagged draft, so block here instead of persisting the stale value.
    if (hasInvalidDraft) {
      setSaveBlockedByInvalidDraft(true);
      return;
    }
    const savedFromWatchId = watchId;
    const enabledSavedFrom = enabledById;
    const storedEnabledById = new Map(
      (workersData?.workers ?? []).map((worker) => [worker.id, worker.enabled])
    );
    let savedWorkers: Worker[];
    try {
      savedWorkers = await save();
      setSaveBlockedByInvalidDraft(false);
    } catch (saveError) {
      if (saveError instanceof Error && saveError.message === 'invalid') {
        setSaveBlockedByInvalidDraft(true);
        return;
      }
      throw saveError;
    }
    // The page stays mounted across Watches; a notice from the Watch the user left would mislead.
    if (currentWatchId.current !== savedFromWatchId) {
      return;
    }
    const savedEnabledById = new Map(savedWorkers.map((worker) => [worker.id, worker.enabled]));
    const enabledAfterSave: WorkerEnabledById = new Map(
      [...enabledSavedFrom].map(([workerId, enabled]) => [
        workerId,
        savedEnabledById.get(workerId) ?? storedEnabledById.get(workerId) ?? enabled,
      ])
    );
    setBlockedNoticeQueue(
      getBlockedAfterSaveNotices(storedEnabledById, enabledAfterSave, savedWorkers)
    );
  }, [save, hasInvalidDraft, watchId, enabledById, workersData?.workers]);

  const handleEnabledChange = useCallback(
    (worker: Worker, enabled: boolean) => {
      const confirmation = enabled ? undefined : getDisableConfirmation(worker.id, enabledById);
      if (confirmation) {
        setPendingDisable({ worker, confirmation });
        return;
      }
      updateEnabled(worker, enabled);
    },
    [enabledById, updateEnabled]
  );

  const confirmPendingDisable = useCallback(() => {
    if (pendingDisable) {
      updateEnabled(pendingDisable.worker, false);
    }
    setPendingDisable(null);
  }, [pendingDisable, updateEnabled]);

  const onDiscard = useCallback(() => {
    discard();
    setSaveBlockedByInvalidDraft(false);
    setInvalidTriggerWorkerIds(new Set());
    setDraftResetKey((key) => key + 1);
  }, [discard]);

  // Collapsed Workers (default: all expanded). Parameter-only navigation keeps this page mounted,
  // so the initializer runs only on the first Watch — reset whenever watchId changes.
  const [collapsedWorkerIds, setCollapsedWorkerIds] = useState<Set<string>>(() => new Set());
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const discardConfirmTitleId = useGeneratedHtmlId({ prefix: 'alertZeroWatchDiscardConfirm' });

  const hiddenChangedWorkers = useMemo(() => {
    const changedIds = new Set([...dirtyWorkers.map(({ id }) => id), ...invalidTriggerWorkerIds]);
    // A failed reload keeps the drafts but replaces every Worker panel with the error.
    return members.filter(
      ({ id }) => changedIds.has(id) && (Boolean(workersError) || collapsedWorkerIds.has(id))
    );
  }, [dirtyWorkers, invalidTriggerWorkerIds, members, collapsedWorkerIds, workersError]);

  // Changes inside a collapsed Worker are out of sight, so name them before throwing them away.
  const onDiscardClick = useCallback(() => {
    if (hiddenChangedWorkers.length > 0) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    onDiscard();
  }, [hiddenChangedWorkers, onDiscard]);

  const onDiscardConfirm = useCallback(() => {
    setIsDiscardConfirmOpen(false);
    onDiscard();
  }, [onDiscard]);

  const isMultiWorker = members.length > 1;
  const blockedNotice = blockedNoticeQueue[0];

  const headerPrimaryActionItem = useMemo(
    () => ({
      id: 'alertZeroWatchSettingsSave',
      label: settingsI18n.SAVE_WATCH_SETTINGS,
      iconType: 'save' as const,
      isLoading: isSaving,
      disableButton: !canWrite || !isDirty || isSaving || Boolean(workersError) || hasInvalidDraft,
      tooltipContent: getSaveTooltip(canWrite, hasUnsavedChanges),
      testId: 'alertZeroWatchSettingsSave',
      run: onSave,
    }),
    [canWrite, isSaving, isDirty, hasUnsavedChanges, workersError, hasInvalidDraft, onSave]
  );

  const headerItems = useMemo(
    () => [
      {
        id: 'alertZeroWatchSettingsDiscard',
        label: settingsI18n.DISCARD_WATCH_SETTINGS,
        iconType: 'cross' as const,
        // A flagged trigger amount is not part of the draft, so it can be the only thing to undo.
        disableButton: !canWrite || (!isDirty && !hasInvalidDraft) || isSaving,
        tooltipContent: !canWrite ? settingsI18n.READ_ONLY_TOOLTIP : undefined,
        testId: 'alertZeroWatchSettingsDiscard',
        run: onDiscardClick,
      },
    ],
    [canWrite, isDirty, isSaving, hasInvalidDraft, onDiscardClick]
  );

  useEffect(() => {
    setCollapsedWorkerIds(new Set());
    // Overlays are keyed by `worker.id` and a shared Worker never remounts, so unsaved edits would
    // follow the analyst to the next Watch and could be saved there. Drop drafts, clear flags, and
    // bump the reset key so the controls re-read stored settings.
    discard();
    setInvalidTriggerWorkerIds(new Set());
    setSaveBlockedByInvalidDraft(false);
    setDraftResetKey((key) => key + 1);
    setPendingDisable(null);
    setBlockedNoticeQueue([]);
    setIsDiscardConfirmOpen(false);
  }, [watchId, discard]);

  const handleToggleWorker = useCallback((workerId: string, isOpen: boolean) => {
    setCollapsedWorkerIds((current) => {
      const next = new Set(current);
      if (isOpen) {
        next.delete(workerId);
      } else {
        next.add(workerId);
      }
      return next;
    });
  }, []);

  const hasCurrentWatch = watch?.id === watchId;
  const isNotFound =
    (isHttpFetchError(error) && error.response?.status === 404) ||
    (!isLoading && !error && !hasCurrentWatch);

  const isWatchLoading = !hasCurrentWatch && isLoading;
  useReportErrorShown({
    errorClass: isNotFound ? 'not_found' : classifyError(error),
    isShown: !isWatchLoading && (!watch || !hasCurrentWatch),
    isRefetching: isFetching,
    resetKey: watchId,
    surface: 'watch_detail',
  });
  useReportErrorShown({
    errorClass: classifyError(workersError),
    isShown: Boolean(workersError) && Boolean(watch) && hasCurrentWatch,
    isRefetching: workersFetching,
    resetKey: watchId,
    surface: 'watch_detail',
  });

  if (isWatchLoading) {
    return (
      <WatchesSectionLayout active={watchId} title={i18n.PAGE_TITLE}>
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCH} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </WatchesSectionLayout>
    );
  }

  if (!watch || !hasCurrentWatch) {
    return (
      <WatchesSectionLayout active={watchId} title={i18n.PAGE_TITLE}>
        <EuiEmptyPrompt
          iconType={isNotFound ? 'search' : 'error'}
          title={<h2>{isNotFound ? i18n.WATCH_NOT_FOUND_TITLE : i18n.WATCH_LOAD_ERROR_TITLE}</h2>}
          body={<p>{isNotFound ? i18n.WATCH_NOT_FOUND_BODY : i18n.WATCH_LOAD_ERROR_BODY}</p>}
          actions={
            <EuiFlexGroup gutterSize="s" justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => history.push('/watches')}>
                  {i18n.BACK_TO_WATCHES}
                </EuiButton>
              </EuiFlexItem>
              {error && !isNotFound ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={() => refetch()}>{i18n.RETRY}</EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
        />
      </WatchesSectionLayout>
    );
  }

  const headerBadges = [
    ...(!workersLoading && !workersError
      ? [
          {
            label: i18n.workerCountLabel(members.length),
            color: 'hollow' as const,
            'data-test-subj': 'alertZeroWatchWorkerCount',
          },
        ]
      : []),
    ...(hasUnsavedChanges
      ? [
          {
            label: settingsI18n.UNSAVED_CHANGES_BADGE_LABEL,
            color: 'warning' as const,
            'data-test-subj': 'alertZeroWatchUnsavedChangesBadge',
          },
        ]
      : []),
  ];

  const renderWorkers = () => {
    if (workersError) {
      return (
        <EuiEmptyPrompt
          iconType="error"
          title={<h2>{i18n.WORKERS_LOAD_ERROR_TITLE}</h2>}
          body={<p>{i18n.WORKERS_LOAD_ERROR_BODY}</p>}
          actions={<EuiButtonEmpty onClick={() => refetchWorkers()}>{i18n.RETRY}</EuiButtonEmpty>}
          data-test-subj="alertZeroWatchWorkersLoadError"
        />
      );
    }

    if (workersLoading && members.length === 0) {
      return <EuiLoadingSpinner size="m" aria-label={i18n.LOADING_WATCH} />;
    }

    if (members.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="visTagCloud"
          title={<h2>{settingsI18n.WORKERS_EMPTY_TITLE}</h2>}
          body={<p>{settingsI18n.WORKERS_EMPTY_BODY}</p>}
          data-test-subj="alertZeroWatchWorkersEmpty"
        />
      );
    }

    return (
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.m};
        `}
      >
        {members.map((worker) => {
          const draft = resolve(worker);
          return (
            <section key={worker.id} data-test-subj={`alertZeroWatchWorkerSection-${worker.id}`}>
              <WorkerSettingsPanel
                worker={worker}
                isAccordion={isMultiWorker}
                isExpanded={!collapsedWorkerIds.has(worker.id)}
                onToggle={handleToggleWorker}
                enabled={draft.enabled}
                settings={draft.settings}
                error={draft.error}
                warningReasons={getWorkerWarningReasons(worker, enabledById, {
                  includeBlocking: canWrite,
                })}
                settingsLocked={worker.state === 'unavailable'}
                isSaving={isSaving}
                canWrite={canWrite}
                onEnabledChange={(enabled) => handleEnabledChange(worker, enabled)}
                onSettingsChange={(patch) => updateSettings(worker, patch)}
                onTriggerValidityChange={(isValid) =>
                  handleTriggerValidityChange(worker.id, isValid)
                }
                draftResetKey={draftResetKey}
              />
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <WatchesSectionLayout
      active={watchId}
      title={watch.name}
      badges={headerBadges.length > 0 ? headerBadges : undefined}
      headerPrimaryActionItem={headerPrimaryActionItem}
      headerItems={headerItems}
    >
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
        {!canWrite ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              iconType="lock"
              data-test-subj="alertZeroReadOnlyCallout"
            >
              {settingsI18n.READ_ONLY_CALLOUT_MESSAGE}
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}
        {saveBlockedByInvalidDraft || hasInvalidDraft ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="danger" data-test-subj="alertZeroWatchSettingsInvalid">
              <p>{settingsI18n.WATCH_SETTINGS_INVALID}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem grow={false} data-test-subj="alertZeroWatchWorkersSection">
          {renderWorkers()}
        </EuiFlexItem>
      </EuiFlexGroup>
      {pendingDisable ? (
        <WorkerDisableConfirmModal
          confirmation={pendingDisable.confirmation}
          onConfirm={confirmPendingDisable}
          onCancel={() => setPendingDisable(null)}
        />
      ) : null}
      {isDiscardConfirmOpen ? (
        <EuiConfirmModal
          title={settingsI18n.DISCARD_CONFIRM_TITLE}
          titleProps={{ id: discardConfirmTitleId }}
          aria-labelledby={discardConfirmTitleId}
          onCancel={() => setIsDiscardConfirmOpen(false)}
          onConfirm={onDiscardConfirm}
          cancelButtonText={settingsI18n.KEEP_EDITING_BUTTON_LABEL}
          confirmButtonText={settingsI18n.DISCARD_CONFIRM_BUTTON_LABEL}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="alertZeroWatchDiscardConfirmModal"
        >
          <p>{settingsI18n.DISCARD_CONFIRM_DESCRIPTION}</p>
          <ul>
            {hiddenChangedWorkers.map((worker) => (
              <li key={worker.id}>{workerName(worker.id, worker.name)}</li>
            ))}
          </ul>
        </EuiConfirmModal>
      ) : null}
      {blockedNotice ? (
        <WorkerBlockedAfterSaveModal
          workerName={workerName(blockedNotice.workerId)}
          reasons={blockedNotice.reasons}
          onAcknowledge={() => setBlockedNoticeQueue((queue) => queue.slice(1))}
        />
      ) : null}
    </WatchesSectionLayout>
  );
};
