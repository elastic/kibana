/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { RumAlertFireBucket } from '../../../../common/rum_alert_episodes';
import {
  isRumAlertFireStatus,
  rumAlertEpisodeRange,
  rumAlertInvestigateTarget,
} from '../../../../common/rum_alert_episodes';
import { rumAlertTemplateLabel } from '../../../../common/rum_alerts';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import {
  deleteRumAlert,
  disableRumAlert,
  enableRumAlert,
  fetchRumAlertStatus,
  fetchRumAlerts,
  type RumAlertEpisodeSummary,
  type RumAlertRuleSummary,
  type RumAlertStatus,
} from '../../../services/rest/rum_alerts_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { RumAlertCharts } from './alert_charts';
import { useRumAlertFlyout } from './alert_flyout_context';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';

const RelativeTime = ({ value }: { value?: string }) => {
  if (!value) {
    return <span>—</span>;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return <span>—</span>;
  }
  return (
    <EuiToolTip content={value}>
      <span tabIndex={0}>
        <FormattedRelative value={new Date(parsed)} />
      </span>
    </EuiToolTip>
  );
};

const episodeStatusLabel = (status: string | undefined): string => {
  switch (status) {
    case 'active':
    case 'pending':
      return i18n.translate('xpack.ux.alerts.episodeFiringLabel', { defaultMessage: 'Firing' });
    case 'recovering':
      return i18n.translate('xpack.ux.alerts.episodeRecoveringLabel', {
        defaultMessage: 'Recovering',
      });
    case 'inactive':
      return i18n.translate('xpack.ux.alerts.episodeRecoveredLabel', {
        defaultMessage: 'Recovered',
      });
    default:
      return status || '—';
  }
};

const episodeStatusColor = (
  status: string | undefined
): 'danger' | 'warning' | 'success' | 'subdued' => {
  switch (status) {
    case 'active':
    case 'pending':
      return 'danger';
    case 'recovering':
      return 'warning';
    case 'inactive':
      return 'success';
    default:
      return 'subdued';
  }
};

export function RumAlertsPanel() {
  const { http, notifications, application } = useKibanaServices();
  const history = useHistory();
  const { open } = useRumAlertFlyout();
  const [status, setStatus] = useState<RumAlertStatus | null>(null);
  const [rules, setRules] = useState<RumAlertRuleSummary[]>([]);
  const [episodes, setEpisodes] = useState<RumAlertEpisodeSummary[]>([]);
  const [fireTrend, setFireTrend] = useState<RumAlertFireBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextStatus = await fetchRumAlertStatus(http);
      setStatus(nextStatus);
      if (!nextStatus.available) {
        setRules([]);
        setEpisodes([]);
        setFireTrend([]);
        return;
      }
      const result = await fetchRumAlerts(http);
      setRules(result.rules);
      setEpisodes(result.episodes);
      setFireTrend(result.fireTrend ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    void load();
  }, [load]);

  const toastError = useCallback(
    (err: unknown, title: string) => {
      notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), { title });
    },
    [notifications.toasts]
  );

  const investigateRule = useCallback(
    (rule: RumAlertRuleSummary, timestamp?: string) => {
      const target = rumAlertInvestigateTarget(rule.templateId);
      const range = timestamp ? rumAlertEpisodeRange(timestamp) : undefined;
      const patch =
        target.pathname === '/session-replay'
          ? sessionsPatch({
              frustration: target.frustration,
              rangeFrom: range?.rangeFrom,
              rangeTo: range?.rangeTo,
            })
          : {
              frustration: target.frustration,
              rangeFrom: range?.rangeFrom,
              rangeTo: range?.rangeTo,
            };
      pushRumPath(history, target.pathname, patch);
    },
    [history]
  );

  const managementHref = application.getUrlForApp('management', {
    path: '/insightsAndAlerting/triggersActions/rules',
  });

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const firingCount = episodes.filter((episode) => isRumAlertFireStatus(episode.status)).length;
  const lastFireAt = useMemo(() => {
    const timestamps = rules
      .map((rule) => rule.lastFiredAt)
      .filter((value): value is string => Boolean(value));
    if (timestamps.length === 0) {
      return undefined;
    }
    return timestamps.sort().at(-1);
  }, [rules]);
  const disabledWithFires = rules.find((rule) => !rule.enabled && rule.lastFiredAt);

  if (loading && !status) {
    return <EuiLoadingSpinner />;
  }

  if (status && !status.available) {
    return (
      <EuiCallOut
        announceOnMount
        color="warning"
        title={i18n.translate('xpack.ux.alerts.disabledTitle', {
          defaultMessage: 'Alerting v2 is not available',
        })}
      >
        <p>
          {i18n.translate('xpack.ux.alerts.disabledBody', {
            defaultMessage:
              'Enable the alerting:v2:enabled advanced setting and restart Kibana to create RUM alerts.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  const ruleColumns: Array<EuiBasicTableColumn<RumAlertRuleSummary>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.ux.alerts.table.name', { defaultMessage: 'Name' }),
      render: (_name: string, rule: RumAlertRuleSummary) => (
        <EuiLink
          data-test-subj={`uxAlertInvestigate-${rule.id}`}
          onClick={() => investigateRule(rule)}
        >
          {rule.name}
        </EuiLink>
      ),
    },
    {
      field: 'templateId',
      name: i18n.translate('xpack.ux.alerts.table.template', { defaultMessage: 'Template' }),
      render: (templateId: RumAlertRuleSummary['templateId']) =>
        templateId ? rumAlertTemplateLabel(templateId) : '—',
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ux.alerts.table.condition', { defaultMessage: 'Condition' }),
    },
    {
      name: i18n.translate('xpack.ux.alerts.table.scheduleLabel', { defaultMessage: 'Schedule' }),
      width: '140px',
      render: (rule: RumAlertRuleSummary) =>
        rule.lookback ? `${rule.every} / ${rule.lookback}` : rule.every,
    },
    {
      field: 'lastFiredAt',
      name: i18n.translate('xpack.ux.alerts.table.lastFireLabel', { defaultMessage: 'Last fire' }),
      width: '130px',
      render: (lastFiredAt: string | undefined) => <RelativeTime value={lastFiredAt} />,
    },
    {
      field: 'enabled',
      name: i18n.translate('xpack.ux.alerts.table.status', { defaultMessage: 'Status' }),
      width: '110px',
      render: (enabled: boolean) => (
        <EuiHealth color={enabled ? 'success' : 'subdued'}>
          {enabled
            ? i18n.translate('xpack.ux.alerts.status.enabled', { defaultMessage: 'Enabled' })
            : i18n.translate('xpack.ux.alerts.status.disabled', { defaultMessage: 'Disabled' })}
        </EuiHealth>
      ),
    },
    {
      name: i18n.translate('xpack.ux.alerts.table.actions', { defaultMessage: 'Actions' }),
      width: '220px',
      render: (rule: RumAlertRuleSummary) => (
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxAlertInvestigate"
              onClick={() => investigateRule(rule, rule.lastFiredAt)}
            >
              {i18n.translate('xpack.ux.alerts.investigateButtonLabel', {
                defaultMessage: 'Investigate',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxAlertToggle"
              onClick={() =>
                void (rule.enabled ? disableRumAlert(http, rule.id) : enableRumAlert(http, rule.id))
                  .then(() => load())
                  .catch((err) =>
                    toastError(
                      err,
                      i18n.translate('xpack.ux.alerts.toggleError', {
                        defaultMessage: 'Unable to update alert',
                      })
                    )
                  )
              }
            >
              {rule.enabled
                ? i18n.translate('xpack.ux.alerts.disable', { defaultMessage: 'Disable' })
                : i18n.translate('xpack.ux.alerts.enable', { defaultMessage: 'Enable' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="danger"
              data-test-subj="uxAlertDelete"
              onClick={() =>
                void deleteRumAlert(http, rule.id)
                  .then(() => load())
                  .catch((err) =>
                    toastError(
                      err,
                      i18n.translate('xpack.ux.alerts.deleteError', {
                        defaultMessage: 'Unable to delete alert',
                      })
                    )
                  )
              }
            >
              {i18n.translate('xpack.ux.alerts.delete', { defaultMessage: 'Delete' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const episodeColumns: Array<EuiBasicTableColumn<RumAlertEpisodeSummary>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.ux.alerts.episodes.time', { defaultMessage: 'Time' }),
      render: (timestamp: string) => <RelativeTime value={timestamp} />,
    },
    {
      field: 'status',
      name: i18n.translate('xpack.ux.alerts.episodes.status', { defaultMessage: 'Status' }),
      width: '120px',
      render: (episodeStatus: string | undefined) => (
        <EuiHealth color={episodeStatusColor(episodeStatus)}>
          {episodeStatusLabel(episodeStatus)}
        </EuiHealth>
      ),
    },
    {
      field: 'ruleId',
      name: i18n.translate('xpack.ux.alerts.episodes.rule', { defaultMessage: 'Rule' }),
      render: (ruleId: string | undefined) =>
        rules.find((rule) => rule.id === ruleId)?.name || ruleId || '—',
    },
    {
      name: i18n.translate('xpack.ux.alerts.episodes.actionsLabel', { defaultMessage: 'Actions' }),
      width: '140px',
      render: (episode: RumAlertEpisodeSummary) => {
        const rule = rules.find((item) => item.id === episode.ruleId);
        if (!rule) {
          return null;
        }
        return (
          <EuiButtonEmpty
            size="s"
            data-test-subj="uxAlertEpisodeInvestigate"
            onClick={() => investigateRule(rule, episode.timestamp)}
          >
            {i18n.translate('xpack.ux.alerts.investigateButtonLabel', {
              defaultMessage: 'Investigate',
            })}
          </EuiButtonEmpty>
        );
      },
    },
  ];

  return (
    <div data-test-subj="uxRumAlerts">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <UxTourAnchor stepId="alerts" display="block">
            <EuiTitle size="s">
              <h2>{i18n.translate('xpack.ux.alerts.heading', { defaultMessage: 'RUM alerts' })}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                {status?.notificationsConfigured
                  ? status.to.length > 0
                    ? i18n.translate('xpack.ux.alerts.notifyRecipientsDescription', {
                        defaultMessage: 'Email notifications go to {recipients}.',
                        values: { recipients: status.to.join(', ') },
                      })
                    : i18n.translate('xpack.ux.alerts.notifyOn', {
                        defaultMessage: 'Email notifications are configured.',
                      })
                  : i18n.translate('xpack.ux.alerts.notifyOff', {
                      defaultMessage:
                        'Create an alert and add recipients to start emailing breaches.',
                    })}
              </p>
            </EuiText>
          </UxTourAnchor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="uxAlertCreate"
            fill
            onClick={() => open({ templateId: 'web_vital' })}
          >
            {i18n.translate('xpack.ux.alerts.createButton', { defaultMessage: 'Create alert' })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {error && (
        <EuiCallOut
          announceOnMount
          color="danger"
          title={i18n.translate('xpack.ux.alerts.loadError', {
            defaultMessage: 'Unable to load alerts',
          })}
        >
          <p>{error}</p>
        </EuiCallOut>
      )}
      {rules.length > 0 && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={`${enabledCount}/${rules.length}`}
                  titleSize="s"
                  description={i18n.translate('xpack.ux.alerts.enabledStatLabel', {
                    defaultMessage: 'Enabled',
                  })}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={String(firingCount)}
                  titleSize="s"
                  description={i18n.translate('xpack.ux.alerts.firingStatLabel', {
                    defaultMessage: 'Firing now',
                  })}
                  titleColor={firingCount > 0 ? 'danger' : undefined}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.ux.alerts.lastFireStatLabel', {
                    defaultMessage: 'Last fire',
                  })}
                </EuiText>
                <EuiText>
                  <h3>
                    <RelativeTime value={lastFireAt} />
                  </h3>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <RumAlertCharts
            fireTrend={fireTrend}
            templateIds={rules.map((rule) => rule.templateId)}
          />
          <EuiSpacer />
        </>
      )}
      {disabledWithFires && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            title={i18n.translate('xpack.ux.alerts.disabledFiredTitle', {
              defaultMessage: 'A recent fire is not being watched',
            })}
          >
            <p>
              {i18n.translate('xpack.ux.alerts.disabledFiredDescription', {
                defaultMessage:
                  '{name} fired recently but is disabled. Enable it to keep evaluating and emailing.',
                values: { name: disabledWithFires.name },
              })}
            </p>
            <EuiButton
              data-test-subj="uxAlertEnableDisabled"
              size="s"
              onClick={() =>
                void enableRumAlert(http, disabledWithFires.id)
                  .then(() => load())
                  .catch((err) =>
                    toastError(
                      err,
                      i18n.translate('xpack.ux.alerts.toggleError', {
                        defaultMessage: 'Unable to update alert',
                      })
                    )
                  )
              }
            >
              {i18n.translate('xpack.ux.alerts.enableNamedButtonLabel', {
                defaultMessage: 'Enable {name}',
                values: { name: disabledWithFires.name },
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {rules.length === 0 && !error ? (
        <EuiEmptyPrompt
          title={
            <h3>
              {i18n.translate('xpack.ux.alerts.emptyTitle', {
                defaultMessage: 'No RUM alerts yet',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.ux.alerts.emptyBody', {
                defaultMessage:
                  'Create a web-vital, error-rate, or frustration alert from this tab or any KPI.',
              })}
            </p>
          }
          actions={
            <EuiButton
              data-test-subj="uxAlertEmptyCreate"
              onClick={() => open({ templateId: 'web_vital' })}
            >
              {i18n.translate('xpack.ux.alerts.createButton', { defaultMessage: 'Create alert' })}
            </EuiButton>
          }
        />
      ) : (
        <EuiPanel hasBorder paddingSize="m">
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.alerts.table.caption', {
              defaultMessage: 'RUM alert rules',
            })}
            items={rules}
            columns={ruleColumns}
          />
        </EuiPanel>
      )}
      <EuiSpacer />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ux.alerts.episodesHeading', { defaultMessage: 'Recent episodes' })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m">
        {episodes.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.alerts.episodesEmpty', {
              defaultMessage: 'No episodes yet. Rules evaluate on their schedule.',
            })}
          </EuiText>
        ) : (
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.alerts.episodes.caption', {
              defaultMessage: 'Recent RUM alert episodes',
            })}
            items={episodes}
            columns={episodeColumns}
          />
        )}
      </EuiPanel>
      <EuiSpacer />
      <EuiLink
        data-test-subj="uxRumAlertsPanelOpenStackManagementAlertingLink"
        href={managementHref}
      >
        {i18n.translate('xpack.ux.alerts.managementLink', {
          defaultMessage: 'Open Stack Management alerting',
        })}
      </EuiLink>
    </div>
  );
}
