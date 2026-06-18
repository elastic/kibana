/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import {
  setupApmAnomalyJobs,
  setupLogsAnalysisModule,
  setupLogsCategoriesModule,
  setupMetricsHostsModule,
} from './api';
import { LOGS_INDEX_PATTERN, METRICS_INDEX_PATTERN } from './constants';
import { DATA_TYPE_META } from './data_types';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  environments: string[];
  isLoadingEnvironments: boolean;
  canCreateJob: boolean;
}

type SignalId = 'apm' | 'logs' | 'metrics';

interface SignalSelection {
  apm: boolean;
  logs: boolean;
  metrics: boolean;
}

interface JobGroupPreview {
  id: string;
  signal: SignalId;
  name: string;
  description: string;
  detail: string;
}

interface CreateTask {
  label: string;
  promise: Promise<unknown>;
}

const DEFAULT_SIGNAL_SELECTION: SignalSelection = {
  apm: true,
  logs: true,
  metrics: true,
};

export const MlJobsPanel: React.FC<Props> = ({
  http,
  notifications,
  environments,
  isLoadingEnvironments,
  canCreateJob,
}) => {
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const [signals, setSignals] = useState<SignalSelection>(DEFAULT_SIGNAL_SELECTION);
  const [isCreating, setIsCreating] = useState(false);

  const selectedEnvironment = environment ?? environments[0];
  const hasEnvironments = environments.length > 0;

  const toggleSignal = (signalId: SignalId) => {
    setSignals((current) => ({ ...current, [signalId]: !current[signalId] }));
  };

  const jobGroupPreviews = useMemo((): JobGroupPreview[] => {
    const previews: JobGroupPreview[] = [];

    if (signals.apm && selectedEnvironment) {
      previews.push({
        id: 'apm-anomaly',
        signal: 'apm',
        name: i18n.translate('xpack.observability_onboarding.demoData.ml.preview.apmName', {
          defaultMessage: 'APM anomaly detection ({environment})',
          values: { environment: selectedEnvironment },
        }),
        description: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.apmDescription',
          {
            defaultMessage: 'Detects unusual latency and error-rate patterns across APM services.',
          }
        ),
        detail: i18n.translate('xpack.observability_onboarding.demoData.ml.preview.apmDetail', {
          defaultMessage:
            'Scoped to service.environment: {environment}. Starting point — tune sensitivity after the first week of data.',
          values: { environment: selectedEnvironment },
        }),
      });
    }

    if (signals.logs) {
      previews.push({
        id: 'logs-entry-rate',
        signal: 'logs',
        name: i18n.translate('xpack.observability_onboarding.demoData.ml.preview.logsRateName', {
          defaultMessage: 'Log entry rate ({indexPattern})',
          values: { indexPattern: LOGS_INDEX_PATTERN },
        }),
        description: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.logsRateDescription',
          {
            defaultMessage: 'Detects unusual log ingestion rates over time.',
          }
        ),
        detail: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.logsRateDetail',
          {
            defaultMessage:
              'Module logs_ui_analysis. Starting point — adjust index pattern or filters in ML if needed.',
          }
        ),
      });

      previews.push({
        id: 'logs-categories',
        signal: 'logs',
        name: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.logsCategoriesName',
          {
            defaultMessage: 'Log entry categories ({indexPattern})',
            values: { indexPattern: LOGS_INDEX_PATTERN },
          }
        ),
        description: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.logsCategoriesDescription',
          {
            defaultMessage: 'Detects anomalies in counts of log entries grouped by category.',
          }
        ),
        detail: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.logsCategoriesDetail',
          {
            defaultMessage:
              'Module logs_ui_categories. Starting point — review categories after data accumulates.',
          }
        ),
      });
    }

    if (signals.metrics) {
      previews.push({
        id: 'metrics-hosts',
        signal: 'metrics',
        name: i18n.translate('xpack.observability_onboarding.demoData.ml.preview.metricsName', {
          defaultMessage: 'Host metrics ({indexPattern})',
          values: { indexPattern: METRICS_INDEX_PATTERN },
        }),
        description: i18n.translate(
          'xpack.observability_onboarding.demoData.ml.preview.metricsDescription',
          {
            defaultMessage: 'Detects anomalies in host memory usage and network throughput.',
          }
        ),
        detail: i18n.translate('xpack.observability_onboarding.demoData.ml.preview.metricsDetail', {
          defaultMessage:
            'Module metrics_ui_hosts (memory, network in/out). Starting point — tune per host group in ML.',
        }),
      });
    }

    return previews;
  }, [selectedEnvironment, signals.apm, signals.logs, signals.metrics]);

  const hasSelectedSignals = signals.apm || signals.logs || signals.metrics;
  const apmBlocked = signals.apm && !hasEnvironments;
  const canSubmit =
    canCreateJob && hasSelectedSignals && (!signals.apm || hasEnvironments) && !isCreating;

  const buildCreateTasks = (): CreateTask[] => {
    const tasks: CreateTask[] = [];

    if (signals.apm && selectedEnvironment) {
      tasks.push({
        label: i18n.translate('xpack.observability_onboarding.demoData.ml.task.apm', {
          defaultMessage: 'APM anomaly detection',
        }),
        promise: setupApmAnomalyJobs(http, [selectedEnvironment]),
      });
    }

    if (signals.logs) {
      tasks.push({
        label: i18n.translate('xpack.observability_onboarding.demoData.ml.task.logsRate', {
          defaultMessage: 'Log entry rate',
        }),
        promise: setupLogsAnalysisModule(http),
      });
      tasks.push({
        label: i18n.translate('xpack.observability_onboarding.demoData.ml.task.logsCategories', {
          defaultMessage: 'Log entry categories',
        }),
        promise: setupLogsCategoriesModule(http),
      });
    }

    if (signals.metrics) {
      tasks.push({
        label: i18n.translate('xpack.observability_onboarding.demoData.ml.task.metricsHosts', {
          defaultMessage: 'Host metrics',
        }),
        promise: setupMetricsHostsModule(http),
      });
    }

    return tasks;
  };

  const onCreate = async () => {
    const tasks = buildCreateTasks();
    if (tasks.length === 0) {
      return;
    }

    setIsCreating(true);

    try {
      const results = await Promise.allSettled(tasks.map((task) => task.promise));

      const succeeded = results
        .map((result, index) => ({ result, label: tasks[index].label }))
        .filter(({ result }) => result.status === 'fulfilled')
        .map(({ label }) => label);

      const failed = results
        .map((result, index) => ({ result, label: tasks[index].label }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ label, result }) => ({
          label,
          reason:
            result.status === 'rejected'
              ? result.reason instanceof Error
                ? result.reason.message
                : String(result.reason)
              : '',
        }));

      if (succeeded.length > 0) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.observability_onboarding.demoData.ml.successToast', {
            defaultMessage: 'Created ML job groups: {groups}.',
            values: { groups: succeeded.join(', ') },
          })
        );
      }

      if (failed.length > 0) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.observability_onboarding.demoData.ml.partialFailureToast', {
            defaultMessage: 'Some ML job groups could not be created.',
          }),
          text: failed.map(({ label, reason }) => `${label}: ${reason}`).join('\n'),
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const signalIconType = (signal: SignalId): string => {
    if (signal === 'metrics') {
      return DATA_TYPE_META.infra.iconType;
    }
    return DATA_TYPE_META[signal].iconType;
  };

  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.demoData.ml.description"
            defaultMessage="Set up starter anomaly detection jobs across APM, logs, and infrastructure metrics. APM jobs are scoped by {field}; logs and metrics use default index patterns. These are starting points you can tune in Machine Learning."
            values={{ field: <code>service.environment</code> }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      {!canCreateJob && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.observability_onboarding.demoData.ml.noPrivilege', {
              defaultMessage:
                'You need Machine Learning create-job privileges and a Platinum license to create anomaly detection jobs.',
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFormRow
        label={i18n.translate('xpack.observability_onboarding.demoData.ml.signalsLabel', {
          defaultMessage: 'Signals to set up',
        })}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="observabilityOnboardingDemoDataMlSignalApm"
              data-test-subj="observabilityOnboardingDemoDataMlSignalApm"
              label={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={DATA_TYPE_META.apm.iconType} size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {i18n.translate('xpack.observability_onboarding.demoData.ml.signal.apm', {
                      defaultMessage: 'APM services',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={signals.apm}
              disabled={!canCreateJob}
              onChange={() => toggleSignal('apm')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="observabilityOnboardingDemoDataMlSignalLogs"
              data-test-subj="observabilityOnboardingDemoDataMlSignalLogs"
              label={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={DATA_TYPE_META.logs.iconType} size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {i18n.translate('xpack.observability_onboarding.demoData.ml.signal.logs', {
                      defaultMessage: 'Logs (entry rate & categories)',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={signals.logs}
              disabled={!canCreateJob}
              onChange={() => toggleSignal('logs')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="observabilityOnboardingDemoDataMlSignalMetrics"
              data-test-subj="observabilityOnboardingDemoDataMlSignalMetrics"
              label={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={DATA_TYPE_META.infra.iconType} size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {i18n.translate('xpack.observability_onboarding.demoData.ml.signal.metrics', {
                      defaultMessage: 'Infrastructure host metrics',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={signals.metrics}
              disabled={!canCreateJob}
              onChange={() => toggleSignal('metrics')}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      {signals.apm && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
            <EuiFlexItem grow={false} css={{ minWidth: 240 }}>
              <EuiFormRow
                label={i18n.translate('xpack.observability_onboarding.demoData.ml.envLabel', {
                  defaultMessage: 'APM environment',
                })}
              >
                <EuiSelect
                  data-test-subj="observabilityOnboardingDemoDataMlEnvironmentSelect"
                  options={environments.map((env) => ({ value: env, text: env }))}
                  value={selectedEnvironment}
                  isLoading={isLoadingEnvironments}
                  disabled={!hasEnvironments}
                  hasNoInitialSelection={!hasEnvironments}
                  onChange={(event) => setEnvironment(event.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {apmBlocked && !isLoadingEnvironments && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                size="s"
                iconType="info"
                title={i18n.translate('xpack.observability_onboarding.demoData.ml.noEnvironments', {
                  defaultMessage: 'No APM environments found yet. Ingest some data first.',
                })}
              />
            </>
          )}
        </>
      )}

      {jobGroupPreviews.length > 0 && (
        <>
          <EuiSpacer size="m" />

          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="xpack.observability_onboarding.demoData.ml.previewTitle"
                  defaultMessage="Will create {jobCount, plural, one {# job group} other {# job groups}}"
                  values={{ jobCount: jobGroupPreviews.length }}
                />
              </h4>
            </EuiTitle>

            <EuiSpacer size="m" />

            {jobGroupPreviews.map((preview) => (
              <EuiFlexGroup
                key={preview.id}
                gutterSize="m"
                alignItems="flexStart"
                css={css({ marginBottom: '12px' })}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon type={signalIconType(preview.signal)} size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{preview.name}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    <p>{preview.description}</p>
                    <p>{preview.detail}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
          </EuiPanel>
        </>
      )}

      <EuiSpacer size="m" />

      <EuiButton
        data-test-subj="observabilityOnboardingDemoDataCreateMlJobButton"
        fill
        isLoading={isCreating}
        disabled={!canSubmit}
        onClick={onCreate}
      >
        <FormattedMessage
          id="xpack.observability_onboarding.demoData.ml.createButton"
          defaultMessage="Create ML jobs"
        />
      </EuiButton>
    </>
  );
};
