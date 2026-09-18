/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useCanWriteAlertZero } from '../../hooks/use_can_write_alertzero';
import { useWatchSettingsDraft } from '../../hooks/use_watch_settings_draft';
import { useWatch } from '../../hooks/use_watches_api';
import { useWorkers } from '../../hooks/use_workers_api';
import { WorkerSettingsPanel } from './components/worker_settings_panel';
import { SettingsSection } from './components/settings_section';
import { WatchesSectionLayout } from './components/watches_section_layout';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';

export const WatchDetailPage: React.FC = () => {
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const canWrite = useCanWriteAlertZero();
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

  return (
    <WatchesSectionLayout active={watchId} title={watch.name}>
      <EuiFlexGroup direction="column" gutterSize="xl" responsive={false}>
        {canWrite ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              {saveBlockedByInvalidDraft ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="danger" data-test-subj="alertZeroWatchSettingsInvalid">
                    <p>{settingsI18n.WATCH_SETTINGS_INVALID}</p>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onDiscard}
                  disabled={!isDirty || isSaving}
                  data-test-subj="alertZeroWatchSettingsDiscard"
                >
                  {settingsI18n.DISCARD_WATCH_SETTINGS}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={onSave}
                  // A failed reload leaves stale Workers in the cache; do not write against them
                  // until Retry in the load-error prompt has succeeded.
                  disabled={!isDirty || isSaving || Boolean(workersError)}
                  isLoading={isSaving}
                  data-test-subj="alertZeroWatchSettingsSave"
                >
                  {settingsI18n.SAVE_WATCH_SETTINGS}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
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
                        settingsLocked={worker.state === 'unavailable'}
                        isSaving={isSaving}
                        canWrite={canWrite}
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
