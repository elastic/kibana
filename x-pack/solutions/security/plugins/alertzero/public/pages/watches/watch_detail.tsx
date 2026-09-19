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

  const onSave = useCallback(async () => {
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
  }, [save]);

  const onDiscard = useCallback(() => {
    discard();
    setSaveBlockedByInvalidDraft(false);
  }, [discard]);

  const isMultiWorker = members.length > 1;

  const headerPrimaryActionItem = useMemo(
    () => ({
      id: 'alertZeroWatchSettingsSave',
      label: settingsI18n.SAVE_WATCH_SETTINGS,
      iconType: 'save' as const,
      isLoading: isSaving,
      disableButton: !isDirty || isSaving || Boolean(workersError),
      testId: 'alertZeroWatchSettingsSave',
      run: onSave,
    }),
    [isSaving, isDirty, workersError, onSave]
  );

  const headerItems = useMemo(
    () => [
      {
        id: 'alertZeroWatchSettingsDiscard',
        label: settingsI18n.DISCARD_WATCH_SETTINGS,
        iconType: 'cross' as const,
        disableButton: !isDirty || isSaving,
        testId: 'alertZeroWatchSettingsDiscard',
        run: onDiscard,
      },
    ],
    [isDirty, isSaving, onDiscard]
  );
  // Track which Workers the reader has collapsed (default: all expanded). `/watches/:watchId`
  // keeps this page mounted across parameter-only navigation, so the initializer runs only on
  // the first Watch — reset the set whenever watchId changes.
  const [collapsedWorkerIds, setCollapsedWorkerIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCollapsedWorkerIds(new Set());
  }, [watchId]);

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
        {saveBlockedByInvalidDraft ? (
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
          <div data-test-subj="alertZeroWatchWorkersSection">{renderWorkers()}</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WatchesSectionLayout>
  );
};
