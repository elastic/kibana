/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { Worker } from '@kbn/pnd-common';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatch } from '../../hooks/use_watches_api';
import { useUpdateWorker, useWorkers } from '../../hooks/use_workers_api';
import { AutonomySlider } from './components/autonomy_slider';
import { SettingsSection } from './components/settings_section';
import { WorkerSkillsTable } from './components/worker_skills_table';
import { WatchesSectionLayout } from './components/watches_section_layout';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';
import { workerName } from './workers/translations';

const WorkerSettingsCard: React.FC<{ worker: Worker }> = ({ worker }) => {
  const { mutate: updateWorker } = useUpdateWorker();
  const settingsLocked = worker.state === 'unavailable';

  return (
    <SettingsSection
      title={workerName(worker.id, worker.name)}
      subtitle={
        settingsLocked
          ? settingsI18n.WORKER_SETTINGS_UNAVAILABLE
          : settingsI18n.WORKER_SECTION_SUBTITLE
      }
      data-test-subj={`pndWatchWorkerSection-${worker.id}`}
    >
      <EuiSwitch
        label={settingsI18n.ENABLED_SWITCH_LABEL}
        checked={worker.enabled}
        disabled={settingsLocked}
        onChange={(event) =>
          updateWorker({ workerId: worker.id, patch: { enabled: event.target.checked } })
        }
        data-test-subj={`pndWorkerEnabledSwitch-${worker.id}`}
      />
      <EuiSpacer size="m" />
      <AutonomySlider
        current={worker.settings.autonomy}
        isDisabled={settingsLocked}
        onChange={(autonomyLevel) =>
          updateWorker({ workerId: worker.id, patch: { autonomyLevel } })
        }
      />
      <EuiSpacer size="m" />
      <WorkerSkillsTable skills={worker.skills} />
    </SettingsSection>
  );
};

export const WatchDetailPage: React.FC = () => {
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const { data, isLoading, error, refetch } = useWatch(watchId);
  const {
    data: workersData,
    isLoading: workersLoading,
    error: workersError,
    refetch: refetchWorkers,
  } = useWorkers();

  const watch = data?.watch;
  usePndDocTitle(watch?.name ?? i18n.PAGE_TITLE);

  const members = useMemo(
    () => (workersData?.workers ?? []).filter((worker) => worker.watchIds.includes(watchId)),
    [workersData?.workers, watchId]
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

  return (
    <WatchesSectionLayout active={watchId} title={watch.name}>
      <EuiFlexGroup direction="column" gutterSize="xl" responsive={false}>
        {intro ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="pndWatchIntro">
              <p>{intro}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem grow={false}>
          <SettingsSection
            title={settingsI18n.WORKERS_SECTION_TITLE}
            subtitle={settingsI18n.WORKERS_SECTION_SUBTITLE}
            data-test-subj="pndWatchWorkersSection"
          >
            {workersError ? (
              <EuiEmptyPrompt
                iconType="error"
                title={<h2>{i18n.WORKERS_LOAD_ERROR_TITLE}</h2>}
                body={<p>{i18n.WORKERS_LOAD_ERROR_BODY}</p>}
                actions={
                  <EuiButtonEmpty onClick={() => refetchWorkers()}>{i18n.RETRY}</EuiButtonEmpty>
                }
                data-test-subj="pndWatchWorkersLoadError"
              />
            ) : workersLoading && members.length === 0 ? (
              <EuiLoadingSpinner size="m" aria-label={i18n.LOADING_WATCH} />
            ) : (
              <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
                {members.map((worker) => (
                  <EuiFlexItem key={worker.id} grow={false}>
                    <WorkerSettingsCard worker={worker} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </SettingsSection>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WatchesSectionLayout>
  );
};
