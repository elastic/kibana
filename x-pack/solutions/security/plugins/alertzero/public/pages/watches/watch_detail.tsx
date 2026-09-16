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
import {
  useWorkerScrollSpy,
  WatchWorkersSummaryRail,
  workerSectionDomId,
} from './components/watch_workers_summary_rail';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';

const RAIL_NARROW_BREAKPOINT_PX = 1020;

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

  const workerIds = useMemo(() => members.map((worker) => worker.id), [members]);
  const isMultiWorker = members.length > 1;

  // Track which Workers the reader has collapsed (default: all expanded) and which is active in
  // the summary rail. Both reset when navigating to another Watch.
  const [collapsedWorkerIds, setCollapsedWorkerIds] = useState<Set<string>>(() => new Set());
  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(null);

  useEffect(() => {
    setCollapsedWorkerIds(new Set());
    setActiveWorkerId(null);
  }, [watchId]);

  const effectiveActiveWorkerId = activeWorkerId ?? members[0]?.id ?? null;

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
    if (isOpen) {
      setActiveWorkerId(workerId);
    }
  }, []);

  useWorkerScrollSpy(workerIds, isMultiWorker, setActiveWorkerId);

  const layoutStyles = useMemo(
    () => ({
      twoColumn: css`
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: ${euiTheme.size.l};
        align-items: start;
        max-width: 1180px;
        margin-inline: auto;
        @media (max-width: ${RAIL_NARROW_BREAKPOINT_PX}px) {
          grid-template-columns: minmax(0, 1fr);
        }
      `,
      railColumn: css`
        min-width: 0;
        @media (max-width: ${RAIL_NARROW_BREAKPOINT_PX}px) {
          order: -1;
        }
      `,
      workerSection: css`
        scroll-margin-top: ${euiTheme.size.xl};
      `,
    }),
    [euiTheme]
  );

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
      <div css={layoutStyles.twoColumn}>
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          {members.map((worker) => {
            const draft = resolve(worker);
            return (
              <EuiFlexItem key={worker.id} grow={false}>
                <section
                  id={workerSectionDomId(worker.id)}
                  css={layoutStyles.workerSection}
                  data-test-subj={`alertZeroWatchWorkerSection-${worker.id}`}
                >
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
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
        <div css={layoutStyles.railColumn}>
          <WatchWorkersSummaryRail workers={members} activeWorkerId={effectiveActiveWorkerId} />
        </div>
      </div>
    );
  };

  return (
    <WatchesSectionLayout active={watchId} title={watch.name}>
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
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

        {intro ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="alertZeroWatchIntro">
              <p>{intro}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem grow={false}>{renderWorkers()}</EuiFlexItem>
      </EuiFlexGroup>
    </WatchesSectionLayout>
  );
};
