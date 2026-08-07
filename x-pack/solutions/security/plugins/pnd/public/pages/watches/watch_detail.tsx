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
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
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
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  type AutonomyLevel,
  type Watch,
  type WatchCallableRef,
} from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import {
  useApplyWatchUpdate,
  useUpdateWatchSettings,
  useWatch,
} from '../../hooks/use_watches_api';
import { AgentCapabilitiesList } from './components/agent_capabilities_list';
import { AutonomySlider, type UiAutonomy } from './components/autonomy_slider';
import { RecentRunsTable } from './components/recent_runs_table';
import { RunSparkline } from './components/run_sparkline';
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

/** POC: three UI levels mapped onto shipped 1–5 AutonomyLevel. */
const UI_AUTONOMY_TO_STORED: Record<UiAutonomy, AutonomyLevel> = {
  manual: 1,
  assisted: 3,
  supervised: 5,
};

const storedToUiAutonomy = (level: AutonomyLevel): UiAutonomy => {
  if (level <= 2) return 'manual';
  if (level === 3) return 'assisted';
  return 'supervised';
};

const SCHEDULE_INTERVAL_OPTIONS = [
  { value: '15m', text: 'Every 15 minutes' },
  { value: '1h', text: 'Every 1 hour' },
  { value: '6h', text: 'Every 6 hours' },
  { value: '1d', text: 'Every day' },
];

const DATA_SOURCE_OPTIONS = [
  { value: 'alerts-entities-timelines', text: 'Alerts, entities, timelines' },
];

const ASSIGNEE_OPTIONS = [{ value: 'tier1', text: 'Tier 1 — Alert triage' }];

const ESCALATION_OPTIONS = [{ value: 'soc-lead', text: 'SOC lead on-call' }];

interface ApprovalGateRow {
  id: string;
  actionType: string;
  requires: string;
  role: string;
}

const APPROVAL_GATE_ROWS: ApprovalGateRow[] = [
  {
    id: 'host-isolation',
    actionType: 'Host isolation',
    requires: 'Always',
    role: 'Incident lead',
  },
  {
    id: 'detection-rule-change',
    actionType: 'Detection rule change',
    requires: 'Always',
    role: 'Detection engineer',
  },
  {
    id: 'new-detection-rule',
    actionType: 'New detection rule',
    requires: 'Always',
    role: 'Detection engineer',
  },
  {
    id: 'hunt-execution',
    actionType: 'Hunt execution',
    requires: 'High-impact only',
    role: 'Threat hunter',
  },
  {
    id: 'evidence-only',
    actionType: 'Evidence-only investigation',
    requires: 'Runs in scope',
    role: '—',
  },
];

const runAsIdentityFromWatch = (watch: Watch): string => {
  const slug = watch.id
    .replace(/^security-watch-/, '')
    .replace(/^system-security-watch-/, '')
    .replace(/_/g, '-');
  return `svc-watch-${slug}`;
};

export const WatchDetailPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const { services } = useKibana();
  const { data, isLoading, error, refetch } = useWatch(watchId);
  const updateSettings = useUpdateWatchSettings();
  const applyUpdate = useApplyWatchUpdate();

  const [localWatch, setLocalWatch] = useState<Watch | null>(null);
  const [allowManualRun, setAllowManualRun] = useState(true);
  usePndDocTitle(localWatch?.name ?? i18n.PAGE_TITLE);

  useEffect(() => {
    setLocalWatch(null);
    setAllowManualRun(true);
  }, [watchId]);

  useEffect(() => {
    if (!data?.watch || data.watch.id !== watchId) {
      return;
    }
    setLocalWatch(data.watch);
  }, [data, watchId]);

  const stubToast = useCallback(() => {
    services.notifications?.toasts.addInfo(i18n.POC_STUB_TOAST);
  }, [services.notifications]);

  const onUiAutonomyChange = useCallback((ui: UiAutonomy) => {
    setLocalWatch((prev) =>
      prev ? { ...prev, autonomyLevel: UI_AUTONOMY_TO_STORED[ui] } : prev
    );
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
          ...(localWatch.scheduleInterval
            ? { scheduleInterval: localWatch.scheduleInterval }
            : {}),
        },
      });
      setLocalWatch(result.watch);
      services.notifications?.toasts.addSuccess('Watch settings saved');
    } catch (err) {
      services.notifications?.toasts.addError(
        err instanceof Error ? err : new Error(String(err)),
        { title: 'Failed to save watch settings' }
      );
    }
  }, [localWatch, updateSettings, services.notifications]);

  const onToggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (!localWatch) return;
      setLocalWatch({ ...localWatch, enabled, draft: !enabled ? localWatch.draft : false });
      try {
        const result = await updateSettings.mutateAsync({
          watchId: localWatch.id,
          body: { enabled },
        });
        setLocalWatch(result.watch);
        services.notifications?.toasts.addSuccess(enabled ? 'Watch enabled' : 'Watch paused');
      } catch (err) {
        setLocalWatch(localWatch);
        services.notifications?.toasts.addError(
          err instanceof Error ? err : new Error(String(err)),
          { title: 'Failed to toggle watch' }
        );
      }
    },
    [localWatch, updateSettings, services.notifications]
  );

  const onApplyCatalogUpdate = useCallback(async () => {
    if (!localWatch) return;
    try {
      const result = await applyUpdate.mutateAsync({ watchId: localWatch.id });
      if (result.watch) {
        setLocalWatch(result.watch);
      } else {
        await refetch();
      }
      services.notifications?.toasts.addSuccess(
        `Catalogue update applied (v${result.fromVersion} → v${result.toVersion})`
      );
    } catch (err) {
      services.notifications?.toasts.addError(
        err instanceof Error ? err : new Error(String(err)),
        { title: 'Failed to apply catalogue update' }
      );
    }
  }, [localWatch, applyUpdate, refetch, services.notifications]);

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

  const workers = useMemo(
    () => localWatch?.callables.filter((c) => c.kind === 'workflow') ?? [],
    [localWatch]
  );
  const skills = useMemo(
    () => localWatch?.callables.filter((c) => c.kind === 'skill') ?? [],
    [localWatch]
  );

  const approvalColumns = useMemo<Array<EuiBasicTableColumn<ApprovalGateRow>>>(
    () => [
      { field: 'actionType', name: i18n.APPROVAL_COL_ACTION },
      { field: 'requires', name: i18n.APPROVAL_COL_REQUIRES, width: '160px' },
      { field: 'role', name: i18n.APPROVAL_COL_ROLE, width: '180px' },
    ],
    []
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
              label={i18n.ENABLED_BADGE}
              checked={watch.enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              compressed
            />,
            <EuiButton
              key="save"
              fill
              onClick={onSave}
              isLoading={updateSettings.isLoading}
              data-test-subj="pndWatchSaveButton"
            >
              {i18n.SAVE}
            </EuiButton>,
          ]}
        />

        <EuiText size="s">
          <p>{watch.description}</p>
        </EuiText>
        <EuiSpacer size="m" />

        {watch.updateAvailable ? (
          <>
            <EuiCallOut
              title={`Update available (v${watch.seedContentVersion ?? '?'} → v${
                watch.catalogVersion ?? '?'
              })`}
              color="primary"
              iconType="exportAction"
            >
              <p>
                Elastic shipped an improved definition. Your settings (enabled, autonomy, cadence,
                description) will be re-applied. Definition-body edits conflict and are warned.
              </p>
              <EuiButton
                size="s"
                fill
                onClick={onApplyCatalogUpdate}
                isLoading={applyUpdate.isLoading}
                data-test-subj="pndWatchApplyUpdateButton"
              >
                Take update
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

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
            value={storedToUiAutonomy(watch.autonomyLevel)}
            onChange={onUiAutonomyChange}
            onViewGuardrails={stubToast}
          />
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.GENERAL_TITLE} subtitle={i18n.GENERAL_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFormRow label={i18n.RUN_AS_IDENTITY_LABEL} fullWidth>
            <EuiCode>{runAsIdentityFromWatch(watch)}</EuiCode>
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.DESCRIPTION_LABEL}
            helpText="POC: persisted on Save with other watch settings."
            fullWidth
          >
            <EuiTextArea
              value={watch.description}
              onChange={(e) =>
                setLocalWatch((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              rows={2}
              fullWidth
              compressed
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiCallOut title={i18n.MVP_SCOPE_TITLE} color="warning" iconType="iInCircle" size="s">
            <p>{i18n.MVP_SCOPE_BODY}</p>
          </EuiCallOut>
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.TRIGGERS_TITLE} subtitle={i18n.TRIGGERS_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiCallOut color="primary" iconType="iInCircle" size="s" title={i18n.TRIGGERS_SHARED_AD} />
          <EuiSpacer size="m" />
          {watch.scheduleInterval ? (
            <EuiFormRow label={i18n.ATTACK_DISCOVERY_SCHEDULE} fullWidth>
              <EuiSelect
                options={SCHEDULE_INTERVAL_OPTIONS}
                value={watch.scheduleInterval}
                onChange={(e) =>
                  setLocalWatch((prev) =>
                    prev ? { ...prev, scheduleInterval: e.target.value } : prev
                  )
                }
                compressed
                fullWidth
                data-test-subj="pndWatchScheduleInterval"
              />
            </EuiFormRow>
          ) : (
            <EuiCallOut size="s" color="warning" title={i18n.NO_SCHEDULED_TRIGGER} />
          )}
          <EuiSpacer size="m" />
          <EuiFormRow helpText={i18n.ALLOW_MANUAL_RUN_HELP}>
            <EuiSwitch
              label={i18n.ALLOW_MANUAL_RUN}
              checked={allowManualRun}
              onChange={(e) => {
                setAllowManualRun(e.target.checked);
                stubToast();
              }}
              compressed
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.SCOPE_ROUTING_TITLE} subtitle={i18n.SCOPE_ROUTING_SUBTITLE} />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFormRow label={i18n.ALLOWED_DATA_SOURCES} fullWidth>
            <EuiSelect
              options={DATA_SOURCE_OPTIONS}
              value={DATA_SOURCE_OPTIONS[0].value}
              onChange={() => stubToast()}
              compressed
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow label={i18n.DEFAULT_ASSIGNEE_QUEUE} fullWidth>
            <EuiSelect
              options={ASSIGNEE_OPTIONS}
              value={ASSIGNEE_OPTIONS[0].value}
              onChange={() => stubToast()}
              compressed
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow label={i18n.ESCALATION_CONTACT} fullWidth>
            <EuiSelect
              options={ESCALATION_OPTIONS}
              value={ESCALATION_OPTIONS[0].value}
              onChange={() => stubToast()}
              compressed
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
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
                    border-left: 3px solid ${SCOPE_COLOR[scope.access] ?? euiTheme.colors.lightShade};
                  `}
                >
                  {scope.name}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.WORKERS_SECTION_TITLE} subtitle={i18n.WORKERS_SECTION_SUBTITLE} />
        {workers.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>{i18n.WORKERS_EMPTY}</p>
          </EuiText>
        ) : (
          <AgentCapabilitiesList
            callables={workers}
            onToggle={onToggleCallable}
            showKindBadge={false}
          />
        )}

        <EuiSpacer size="l" />

        <SectionHeading title={i18n.SKILLS_SECTION_TITLE} subtitle={i18n.SKILLS_SECTION_SUBTITLE} />
        <EuiCallOut
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
          <AgentCapabilitiesList
            callables={skills}
            onToggle={onToggleCallable}
            showKindBadge={false}
          />
        )}

        <EuiSpacer size="l" />

        <SectionHeading
          title={i18n.APPROVAL_GATES_TITLE}
          subtitle={i18n.APPROVAL_GATES_SUBTITLE}
        />
        <EuiPanel hasBorder paddingSize="m">
          <EuiBasicTable
            items={APPROVAL_GATE_ROWS}
            columns={approvalColumns}
            tableCaption={i18n.APPROVAL_GATES_TITLE}
          />
          <EuiSpacer size="s" />
          <EuiCallOut color="primary" iconType="iInCircle" size="s" title={i18n.APPROVAL_AUDIT_NOTE} />
        </EuiPanel>

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
