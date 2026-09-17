/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useWatchSettingsDraft } from '../../hooks/use_watch_settings_draft';
import { useWatch } from '../../hooks/use_watches_api';
import { useWorkers } from '../../hooks/use_workers_api';
import { WatchesSectionLayout } from './components/watches_section_layout';
import { WorkerSettingsPanel } from './components/worker_settings_panel';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';

export const WatchDetailPage: React.FC = () => {
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, error, refetch } = useWatch(watchId);
  const {
    data: workersData,
    isLoading: workersLoading,
    error: workersError,
    refetch: refetchWorkers,
  } = useWorkers();

  const watch = data?.watch;
  useAlertZeroDocTitle(watch?.name ?? i18n.PAGE_TITLE);

  const members = useMemo(
    () => (workersData?.workers ?? []).filter((worker) => worker.watchIds.includes(watchId)),
    [workersData?.workers, watchId]
  );
  const { discard, isDirty, isSaving, resolve, save, updateEnabled, updateSettings } =
    useWatchSettingsDraft(members);
  const [saveBlockedByInvalidDraft, setSaveBlockedByInvalidDraft] = useState(false);
  // Workers whose trigger control holds an uncommittable amount. That draft never reaches settings
  // state, so the page must hear about it directly or Save would persist the last valid cadence.
  const [invalidTriggerWorkerIds, setInvalidTriggerWorkerIds] = useState<Set<string>>(
    () => new Set()
  );
  // Bumped on Discard so trigger controls drop a flagged draft that no longer has anything behind it.
  const [draftResetKey, setDraftResetKey] = useState(0);
  const hasInvalidDraft = invalidTriggerWorkerIds.size > 0;

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
    try {
      await save();
      setSaveBlockedByInvalidDraft(false);
    } catch (saveError) {
      if (saveError instanceof Error && saveError.message === 'invalid') {
        setSaveBlockedByInvalidDraft(true);
        return;
      }
      throw saveError;
    }
  }, [save, hasInvalidDraft]);

  const onDiscard = useCallback(() => {
    discard();
    setSaveBlockedByInvalidDraft(false);
    setInvalidTriggerWorkerIds(new Set());
    setDraftResetKey((key) => key + 1);
  }, [discard]);

  const isMultiWorker = members.length > 1;

  const headerPrimaryActionItem = useMemo(
    () => ({
      id: 'alertZeroWatchSettingsSave',
      label: settingsI18n.SAVE_WATCH_SETTINGS,
      iconType: 'save' as const,
      isLoading: isSaving,
      disableButton: !isDirty || isSaving || Boolean(workersError) || hasInvalidDraft,
      testId: 'alertZeroWatchSettingsSave',
      run: onSave,
    }),
    [isSaving, isDirty, workersError, hasInvalidDraft, onSave]
  );

  const headerItems = useMemo(
    () => [
      {
        id: 'alertZeroWatchSettingsDiscard',
        label: settingsI18n.DISCARD_WATCH_SETTINGS,
        iconType: 'cross' as const,
        // A flagged trigger amount is not part of the draft, so it can be the only thing to undo.
        disableButton: (!isDirty && !hasInvalidDraft) || isSaving,
        testId: 'alertZeroWatchSettingsDiscard',
        run: onDiscard,
      },
    ],
    [isDirty, isSaving, hasInvalidDraft, onDiscard]
  );
  // Collapsed Workers (default: all expanded). Parameter-only navigation keeps this page mounted,
  // so the initializer runs only on the first Watch — reset whenever watchId changes.
  const [collapsedWorkerIds, setCollapsedWorkerIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCollapsedWorkerIds(new Set());
    // Overlays are keyed by `worker.id` and a shared Worker never remounts, so unsaved edits would
    // follow the analyst to the next Watch and could be saved there. Drop drafts, clear flags, and
    // bump the reset key so the controls re-read stored settings.
    discard();
    setInvalidTriggerWorkerIds(new Set());
    setSaveBlockedByInvalidDraft(false);
    setDraftResetKey((key) => key + 1);
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

  if (!hasCurrentWatch && isLoading) {
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

  const intro = settingsI18n.watchIntro(watch.id);

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
                settingsLocked={worker.state === 'unavailable'}
                isSaving={isSaving}
                onEnabledChange={(enabled) => updateEnabled(worker, enabled)}
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
      headerPrimaryActionItem={headerPrimaryActionItem}
      headerItems={headerItems}
    >
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
        {saveBlockedByInvalidDraft || hasInvalidDraft ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="danger" data-test-subj="alertZeroWatchSettingsInvalid">
              <p>{settingsI18n.WATCH_SETTINGS_INVALID}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}

        {intro ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="alertZeroWatchIntro">
              <p>{intro}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem grow={false}>
          <SettingsSection
            title={settingsI18n.WORKERS_SECTION_TITLE}
            subtitle={settingsI18n.WORKERS_SECTION_SUBTITLE}
            data-test-subj="alertZeroWatchWorkersSection"
          >
            {workersError ? (
              <EuiEmptyPrompt
                iconType="error"
                title={<h2>{i18n.WORKERS_LOAD_ERROR_TITLE}</h2>}
                body={<p>{i18n.WORKERS_LOAD_ERROR_BODY}</p>}
                actions={
                  <EuiButtonEmpty onClick={() => refetchWorkers()}>{i18n.RETRY}</EuiButtonEmpty>
                }
                data-test-subj="alertZeroWatchWorkersLoadError"
              />
            ) : workersLoading && members.length === 0 ? (
              <EuiLoadingSpinner size="m" aria-label={i18n.LOADING_WATCH} />
            ) : (
              <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
                {members.map((worker) => {
                  const draft = resolve(worker);
                  return (
                    <EuiFlexItem key={worker.id} grow={false}>
                      <WorkerSettingsPanel
                        worker={worker}
                        enabled={draft.enabled}
                        settings={draft.settings}
                        error={draft.error}
                        errorLink={draft.errorLink}
                        settingsLocked={worker.state === 'unavailable'}
                        isSaving={isSaving}
                        onEnabledChange={(enabled) => updateEnabled(worker, enabled)}
                        onSettingsChange={(patch) => updateSettings(worker, patch)}
                      />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            )}
          </SettingsSection>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WatchesSectionLayout>
  );
};
