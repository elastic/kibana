/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type AutonomyLevel, type ScopeAccess, type Watch } from '@kbn/pnd-common';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useUpdateWatchSettings, useWatch } from '../../hooks/use_watches_api';
import { AgentCapabilitiesList } from './components/agent_capabilities_list';
import { AutonomySlider } from './components/autonomy_slider';
import { RecentRunsTable } from './components/recent_runs_table';
import { RunSparkline } from './components/run_sparkline';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import * as i18n from './translations';

const SCHEDULE_INTERVAL_OPTIONS = [
  { value: '15m', text: i18n.SCHEDULE_INTERVAL_15_MINUTES },
  { value: '1h', text: i18n.SCHEDULE_INTERVAL_1_HOUR },
  { value: '6h', text: i18n.SCHEDULE_INTERVAL_6_HOURS },
  { value: '1d', text: i18n.SCHEDULE_INTERVAL_1_DAY },
];

const scopeAccessColor = (access: ScopeAccess, euiTheme: EuiThemeComputed): string => {
  switch (access) {
    case 'full':
      return euiTheme.colors.success;
    case 'masked':
      return euiTheme.colors.warning;
    case 'denied':
      return euiTheme.colors.danger;
  }
};

export const WatchDetailPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const { services } = useKibana();
  const { data, isLoading, error, refetch } = useWatch(watchId);
  const updateSettings = useUpdateWatchSettings();
  const capabilities = services.application?.capabilities;
  const hasWatchWritePrivileges =
    capabilities?.pnd?.write === true &&
    capabilities?.workflowsManagement?.[WorkflowsManagementUiActions.read] === true &&
    capabilities?.workflowsManagement?.[WorkflowsManagementUiActions.update] === true;

  const [localWatch, setLocalWatch] = useState<Watch | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  usePndDocTitle(localWatch?.name ?? i18n.PAGE_TITLE);

  useEffect(() => {
    setLocalWatch(null);
    setIsDirty(false);
  }, [watchId]);

  useEffect(() => {
    if (isDirty || !data?.watch || data.watch.id !== watchId) {
      return;
    }
    setLocalWatch(data.watch);
  }, [data, isDirty, watchId]);

  const scheduleIntervalOptions = useMemo(() => {
    const currentInterval = localWatch?.scheduleInterval;
    if (
      !currentInterval ||
      SCHEDULE_INTERVAL_OPTIONS.some(({ value }) => value === currentInterval)
    ) {
      return SCHEDULE_INTERVAL_OPTIONS;
    }
    return [{ value: currentInterval, text: currentInterval }, ...SCHEDULE_INTERVAL_OPTIONS];
  }, [localWatch?.scheduleInterval]);

  const onAutonomyChange = useCallback((level: AutonomyLevel) => {
    setLocalWatch((previous) => (previous ? { ...previous, autonomyLevel: level } : previous));
    setIsDirty(true);
  }, []);

  const onSave = useCallback(async () => {
    if (!localWatch) return;
    try {
      const result = await updateSettings.mutateAsync({
        watchId: localWatch.id,
        body: {
          enabled: localWatch.enabled,
          description: localWatch.description,
          autonomyLevel: localWatch.autonomyLevel,
          scheduleInterval: localWatch.scheduleInterval,
        },
      });
      setLocalWatch(result.watch);
      setIsDirty(false);
      services.notifications?.toasts.addSuccess(i18n.SETTINGS_SAVED);
    } catch (err) {
      services.notifications?.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.SETTINGS_SAVE_FAILED,
      });
    }
  }, [localWatch, updateSettings, services.notifications]);

  const workers = useMemo(
    () => localWatch?.callables.filter(({ kind }) => kind === 'workflow') ?? [],
    [localWatch]
  );
  const skills = useMemo(
    () => localWatch?.callables.filter(({ kind }) => kind === 'skill') ?? [],
    [localWatch]
  );

  const hasCurrentWatch = localWatch?.id === watchId;
  const isNotFound =
    (isHttpFetchError(error) && error.response?.status === 404) ||
    (!isLoading && !error && !hasCurrentWatch);

  if (!hasCurrentWatch && isLoading) {
    return (
      <WatchesSectionLayout active="watches" activeWatchId={watchId}>
        <PndPageSection>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCH} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </PndPageSection>
      </WatchesSectionLayout>
    );
  }

  if (!hasCurrentWatch) {
    const title = isNotFound ? i18n.WATCH_NOT_FOUND_TITLE : i18n.WATCH_LOAD_ERROR_TITLE;
    const body = isNotFound ? i18n.WATCH_NOT_FOUND_BODY : i18n.WATCH_LOAD_ERROR_BODY;
    return (
      <WatchesSectionLayout active="watches" activeWatchId={watchId}>
        <PndPageSection>
          <EuiEmptyPrompt
            iconType={isNotFound ? 'search' : 'error'}
            title={<h2>{title}</h2>}
            body={<p>{body}</p>}
            actions={
              <EuiFlexGroup gutterSize="s" justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => history.push('/watches')}>
                    {i18n.OPEN_A_WATCH}
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
        </PndPageSection>
      </WatchesSectionLayout>
    );
  }

  const watch = localWatch;
  const canEdit = hasWatchWritePrivileges && !watch.managed;

  return (
    <WatchesSectionLayout active="watches" activeWatchId={watch.id}>
      <PndPageSection
        contentProps={{
          css: {
            ['--wt' as string]: watch.color,
          },
        }}
      >
        <PndPageHeader
          title={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>{watch.name}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                {watch.draft ? (
                  <EuiBadge color="warning">{i18n.DRAFT_BADGE}</EuiBadge>
                ) : watch.enabled ? (
                  <EuiBadge color="success">{i18n.ENABLED_BADGE}</EuiBadge>
                ) : (
                  <EuiBadge color="default">{i18n.PAUSED_BADGE}</EuiBadge>
                )}
              </EuiFlexItem>
              {watch.mandate ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{watch.mandate}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
          rightSideItems={[
            <EuiSwitch
              key="enabled"
              label={i18n.ENABLED_TOGGLE}
              checked={watch.enabled}
              onChange={(event) => {
                setLocalWatch((previous) =>
                  previous ? { ...previous, enabled: event.target.checked } : previous
                );
                setIsDirty(true);
              }}
              disabled={!canEdit}
              compressed
              data-test-subj="pndWatchEnabledSwitch"
            />,
            ...(canEdit
              ? [
                  <EuiButton
                    key="save"
                    fill
                    onClick={onSave}
                    isLoading={updateSettings.isLoading}
                    disabled={!isDirty}
                    data-test-subj="pndWatchSaveButton"
                  >
                    {i18n.SAVE}
                  </EuiButton>,
                  <EuiButtonEmpty
                    key="discard"
                    disabled={!isDirty}
                    onClick={() => {
                      if (data?.watch) {
                        setLocalWatch(data.watch);
                        setIsDirty(false);
                      } else {
                        history.push('/watches');
                      }
                    }}
                  >
                    {i18n.DISCARD}
                  </EuiButtonEmpty>,
                ]
              : []),
          ]}
        />

        <EuiText size="s">
          <p>{watch.description}</p>
        </EuiText>
        <EuiSpacer size="m" />

        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: ${euiTheme.size.m};
            max-width: 520px;
            opacity: ${watch.metrics.runs7d == null ? 0.4 : 1};
          `}
        >
          <div>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="m">
                  <strong>{watch.metrics.runs7d ?? '—'}</strong>
                </EuiText>
              </EuiFlexItem>
              {watch.metrics.runs7d != null ? (
                <EuiFlexItem grow={false}>
                  <RunSparkline seed={watch.id} color={watch.color} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiText size="xs" color="subdued">
              {i18n.RUNS_7D}
            </EuiText>
          </div>
          <div>
            <EuiText size="m">
              <strong>
                {watch.metrics.acceptedPct != null ? `${watch.metrics.acceptedPct}%` : '—'}
              </strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {i18n.ACCEPTED}
            </EuiText>
          </div>
          <div>
            <EuiText size="m">
              <strong>{watch.metrics.timeSaved ?? '—'}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {i18n.TIME_SAVED}
            </EuiText>
          </div>
        </div>

        <EuiSpacer size="xl" />

        <SectionHeading title={i18n.AUTONOMY_TITLE} subtitle={i18n.AUTONOMY_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <AutonomySlider
            value={watch.autonomyLevel}
            onChange={onAutonomyChange}
            disabled={!canEdit}
          />
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.GENERAL_TITLE} subtitle={i18n.GENERAL_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFormRow label={i18n.DESCRIPTION_LABEL} helpText={i18n.DESCRIPTION_HELP} fullWidth>
            <EuiTextArea
              value={watch.description}
              onChange={(event) => {
                setLocalWatch((previous) =>
                  previous ? { ...previous, description: event.target.value } : previous
                );
                setIsDirty(true);
              }}
              disabled={!canEdit}
              maxLength={4000}
              rows={2}
              fullWidth
              compressed
              data-test-subj="pndWatchDescription"
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.TRIGGERS_TITLE} subtitle={i18n.TRIGGERS_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          {watch.scheduleInterval ? (
            <EuiFormRow
              label={i18n.SCHEDULE_INTERVAL_LABEL}
              helpText={i18n.SCHEDULE_INTERVAL_HELP}
              fullWidth
            >
              <EuiSelect
                options={scheduleIntervalOptions}
                value={watch.scheduleInterval}
                onChange={(event) => {
                  setLocalWatch((previous) =>
                    previous ? { ...previous, scheduleInterval: event.target.value } : previous
                  );
                  setIsDirty(true);
                }}
                disabled={!canEdit}
                compressed
                fullWidth
                data-test-subj="pndWatchScheduleInterval"
              />
            </EuiFormRow>
          ) : (
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="warning"
              title={i18n.NO_SCHEDULED_TRIGGER}
            />
          )}
          <EuiSpacer size="m" />
          <EuiFormRow helpText={i18n.ALLOW_MANUAL_RUN_HELP}>
            <EuiSwitch
              label={i18n.ALLOW_MANUAL_RUN}
              checked={watch.triggers.some(({ type }) => type === 'manual')}
              onChange={() => undefined}
              disabled
              compressed
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.SCOPE_ROUTING_TITLE} subtitle={i18n.SCOPE_ROUTING_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiText size="xs" color="subdued">
            <p>{i18n.DATA_BOUNDARIES_TITLE}</p>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {watch.scopes.map((scope) => (
              <EuiFlexItem grow={false} key={scope.name}>
                <EuiBadge
                  color="hollow"
                  css={css`
                    border-left: 3px solid ${scopeAccessColor(scope.access, euiTheme)};
                  `}
                >
                  {scope.name}: {scope.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading
          title={i18n.WORKERS_SECTION_TITLE}
          subtitle={i18n.WORKERS_SECTION_SUBTITLE}
        />
        {workers.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>{i18n.WORKERS_EMPTY}</p>
          </EuiText>
        ) : (
          <AgentCapabilitiesList callables={workers} />
        )}

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.SKILLS_SECTION_TITLE} subtitle={i18n.SKILLS_SECTION_SUBTITLE} />
        <EuiCallOut
          announceOnMount={false}
          title={i18n.SKILL_DEPENDENCIES_TITLE}
          color="warning"
          iconType="warning"
          size="s"
        >
          <p>{i18n.SKILL_DEPENDENCIES_BODY}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
        {skills.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>{i18n.SKILLS_EMPTY}</p>
          </EuiText>
        ) : (
          <AgentCapabilitiesList callables={skills} />
        )}

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.RECENT_RUNS_TITLE} subtitle={i18n.RECENT_RUNS_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <RecentRunsTable runs={watch.recentRuns} />
        </EuiPanel>
      </PndPageSection>
    </WatchesSectionLayout>
  );
};

const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="s"
      css={css`
        margin-bottom: ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {subtitle ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {subtitle}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
