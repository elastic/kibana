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
  EuiButtonGroup,
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
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type AutonomyLevel, type Watch, type WatchCallableRef } from '@kbn/pnd-common';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useUpdateWatchSettings, useWatch } from '../../hooks/use_watches_api';
import { AgentCapabilitiesList } from './components/agent_capabilities_list';
import { AutonomyMeter } from './components/autonomy_meter';
import { RecentRunsTable } from './components/recent_runs_table';
import { RunSparkline } from './components/run_sparkline';
import { SchedulePanel } from './components/schedule_panel';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import * as i18n from './translations';

const SCOPE_COLOR: Record<string, string> = {
  full: '#16b3a6',
  masked: '#f59e0b',
  denied: '#ef4444',
};

const SCHEDULE_INTERVAL_OPTIONS = [
  { value: '15m', text: i18n.SCHEDULE_INTERVAL_15_MINUTES },
  { value: '1h', text: i18n.SCHEDULE_INTERVAL_1_HOUR },
  { value: '6h', text: i18n.SCHEDULE_INTERVAL_6_HOURS },
  { value: '1d', text: i18n.SCHEDULE_INTERVAL_1_DAY },
];

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

  const stubToast = useCallback(() => {
    services.notifications?.toasts.addInfo(i18n.POC_STUB_TOAST);
  }, [services.notifications]);

  const onAutonomyChange = useCallback((level: AutonomyLevel) => {
    setLocalWatch((prev) => (prev ? { ...prev, autonomyLevel: level } : prev));
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

  const onToggleCallable = useCallback(
    (callableId: string) => {
      setLocalWatch((prev) => {
        if (!prev) return prev;
        const callables: WatchCallableRef[] = prev.callables.map((c) =>
          c.id === callableId ? { ...c, enabled: !c.enabled } : c
        );
        return { ...prev, callables };
      });
      stubToast();
    },
    [stubToast]
  );

  const callablesOn = useMemo(
    () => localWatch?.callables.filter((c) => c.enabled).length ?? 0,
    [localWatch]
  );

  const hasCurrentWatch = localWatch?.id === watchId;
  const isNotFound =
    (isHttpFetchError(error) && error.response?.status === 404) ||
    (!isLoading && !error && !hasCurrentWatch);

  if (!hasCurrentWatch && isLoading) {
    return (
      <PndPageSection>
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCH} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </PndPageSection>
    );
  }

  if (!hasCurrentWatch) {
    const title = isNotFound ? i18n.WATCH_NOT_FOUND_TITLE : i18n.WATCH_LOAD_ERROR_TITLE;
    const body = isNotFound ? i18n.WATCH_NOT_FOUND_BODY : i18n.WATCH_LOAD_ERROR_BODY;
    return (
      <WatchesSectionLayout active="watches">
        <PndPageSection>
          <EuiEmptyPrompt
            iconType={isNotFound ? 'search' : 'error'}
            title={<h2>{title}</h2>}
            body={<p>{body}</p>}
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
        </PndPageSection>
      </WatchesSectionLayout>
    );
  }

  const watch = localWatch;
  const canEdit = hasWatchWritePrivileges && !watch.managed;

  return (
    <WatchesSectionLayout active="watches">
      <PndPageSection
        contentProps={{
          css: {
            ['--wt' as string]: watch.color,
          },
        }}
      >
        <PndPageHeader
          title={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>{watch.name}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                {watch.draft ? (
                  <EuiBadge color="warning">{i18n.DRAFT_BADGE}</EuiBadge>
                ) : watch.enabled ? (
                  <EuiBadge color="success">{i18n.ACTIVE_BADGE}</EuiBadge>
                ) : (
                  <EuiBadge color="default">{i18n.PAUSED_BADGE}</EuiBadge>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          subtitle={watch.mandate}
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
          backTo={{ path: '/watches', label: i18n.BACK_TO_WATCHES }}
          rightSideItems={[
            <EuiSwitch
              key="enabled"
              label={watch.enabled ? i18n.ACTIVE_BADGE : i18n.PAUSED_BADGE}
              checked={watch.enabled}
              onChange={(e) => {
                setLocalWatch((previous) =>
                  previous ? { ...previous, enabled: e.target.checked } : previous
                );
                setIsDirty(true);
              }}
              disabled={!canEdit}
              compressed
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
            max-width: 480px;
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

        {/* Identity */}
        <SectionHeading title={i18n.IDENTITY_TITLE} subtitle={i18n.IDENTITY_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFormRow label={i18n.DESCRIPTION_LABEL} fullWidth>
            <EuiTextArea
              value={watch.description}
              onChange={(e) => {
                setLocalWatch((prev) => (prev ? { ...prev, description: e.target.value } : prev));
                setIsDirty(true);
              }}
              disabled={!canEdit}
              maxLength={4000}
              rows={2}
              fullWidth
              compressed
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Autonomy */}
        <SectionHeading title={i18n.AUTONOMY_TITLE} subtitle={i18n.AUTONOMY_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFormRow label={i18n.AUTONOMY_LEVEL} fullWidth>
            <div>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <AutonomyMeter level={watch.autonomyLevel} color={watch.color} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiButtonGroup
                legend={i18n.AUTONOMY_LEVEL}
                idSelected={watch.autonomyLevel}
                onChange={(id) => onAutonomyChange(id as AutonomyLevel)}
                options={[
                  { id: 'manual', label: i18n.AUTONOMY_MANUAL_OPTION },
                  { id: 'assisted', label: i18n.AUTONOMY_ASSISTED_OPTION },
                  { id: 'supervised', label: i18n.AUTONOMY_SUPERVISED_OPTION },
                ]}
                buttonSize="compressed"
                color="primary"
                isFullWidth
                isDisabled={!canEdit}
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {i18n.AUTONOMY_GUARDRAILS_NOTE}
              </EuiText>
            </div>
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Schedule */}
        <SectionHeading title={i18n.SCHEDULE_TITLE} subtitle={i18n.SCHEDULE_SUBTITLE} />
        {watch.scheduleInterval ? (
          <>
            <EuiPanel hasBorder paddingSize="m">
              <EuiFormRow
                label={i18n.SCHEDULE_INTERVAL_LABEL}
                helpText={i18n.SCHEDULE_INTERVAL_HELP}
                fullWidth
              >
                <EuiSelect
                  options={scheduleIntervalOptions}
                  value={watch.scheduleInterval}
                  onChange={(e) => {
                    setLocalWatch((prev) =>
                      prev ? { ...prev, scheduleInterval: e.target.value } : prev
                    );
                    setIsDirty(true);
                  }}
                  disabled={!canEdit}
                  compressed
                  fullWidth
                  data-test-subj="pndWatchScheduleInterval"
                />
              </EuiFormRow>
            </EuiPanel>
            <EuiSpacer size="s" />
          </>
        ) : (
          <>
            <EuiCallOut announceOnMount size="s" color="warning" title={i18n.NO_SCHEDULE_TITLE}>
              {i18n.NO_SCHEDULE_DESCRIPTION}
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <SchedulePanel watch={watch} />

        <EuiSpacer size="l" />

        {/* Agent capabilities */}
        <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem>
            <SectionHeading
              title={i18n.AGENT_CAPABILITIES_TITLE}
              subtitle={i18n.agentCapabilitiesSubtitle(callablesOn, watch.callables.length)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="plusInCircle" onClick={stubToast}>
              {i18n.ADD_CAPABILITY}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <AgentCapabilitiesList callables={watch.callables} onToggle={onToggleCallable} />

        <EuiSpacer size="l" />

        {/* Data boundaries */}
        <SectionHeading title={i18n.DATA_BOUNDARIES_TITLE} />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {watch.scopes.map((scope) => (
            <EuiFlexItem grow={false} key={scope.name}>
              <EuiBadge
                color="hollow"
                css={css`
                  border-left: 3px solid ${SCOPE_COLOR[scope.access] ?? euiTheme.colors.lightShade};
                `}
              >
                {scope.name} — {scope.label}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Recent runs */}
        <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem grow={false}>
            <SectionHeading title={i18n.RECENT_RUNS_TITLE} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={stubToast}>
              {i18n.VIEW_ALL_RUNS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
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
