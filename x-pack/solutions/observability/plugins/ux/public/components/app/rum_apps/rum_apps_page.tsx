/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiBasicTableColumn, EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiDescriptionList,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { AgentIcon } from '@kbn/custom-icons';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { FETCH_STATUS, useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { rateVital, type RumVitalRating } from '../../../../common/rum_app';
import {
  mergeRumAppsResponses,
  rumAppsInventoryKpis,
  type RumAppInventoryRow,
  type RumAppPlatform,
  type RumAppsResponse,
} from '../../../../common/rum_apps';
import { rumFiringServiceNames } from '../../../../common/rum_alert_episodes';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumApps } from '../../../services/rest/rum_api';
import { fetchRumAlertStatus, fetchRumAlerts } from '../../../services/rest/rum_alerts_api';
import { mergeRumSearch, pushRumPath } from '../../../utils/rum_search';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalColumnName } from '../../../utils/vital_help_label';
import { uxAppPath } from '../../../utils/ux_app_path';
import { EmptyStateLoading } from '../rum_dashboard/empty_state_loading';
import { EvidencePackFlyout } from './evidence_pack_flyout';
import { ScoreBreakdownFlyout } from './score_breakdown_flyout';
import { InventoryScoreCell } from './score_cell';
import { InventoryEmptyState, useRumAppsSpan } from './out_of_range_traffic';
import { SessionTrafficChart } from './session_traffic_chart';
import { useInventoryChartVisibility } from './use_inventory_chart_visibility';
import {
  useInventoryColumnSelector,
  type InventoryTableColumn,
} from './use_inventory_column_selector';
import { UxInventoryChrome } from './ux_inventory_chrome';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';
import { UxTourInventoryState } from '../rum_tour/ux_tour_context';

const ERROR_RATE_WARN = 0.05;

const androidLabel = i18n.translate('xpack.ux.inventory.androidAriaLabel', {
  defaultMessage: 'Android',
});

const iosLabel = i18n.translate('xpack.ux.inventory.iosAriaLabel', {
  defaultMessage: 'iOS',
});

const dash = i18n.translate('xpack.ux.inventory.emptyValueLabel', {
  defaultMessage: '—',
});

const showChartLabel = i18n.translate('xpack.ux.inventory.showChartButtonLabel', {
  defaultMessage: 'Show chart',
});

const scoreColumnLabel = i18n.translate('xpack.ux.inventory.scoreColumnLabel', {
  defaultMessage: 'Score',
});

const opportunityColumnLabel = i18n.translate('xpack.ux.inventory.opportunityColumnLabel', {
  defaultMessage: 'Opportunity',
});

const opportunityEmptyDescription = i18n.translate(
  'xpack.ux.inventory.opportunityEmptyDescription',
  {
    defaultMessage: 'Needs a score and sessions to rank impact.',
  }
);

const opportunityWhyDescription = i18n.translate('xpack.ux.inventory.opportunityWhyDescription', {
  defaultMessage: 'Higher = more fleet impact if you fix this app',
});

function MetricHoverPopover({
  title,
  button,
  items,
  empty,
}: {
  title: string;
  button: React.ReactElement;
  items?: EuiDescriptionListProps['listItems'];
  empty?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number>();
  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <EuiPopover
      aria-label={title}
      isOpen={open}
      closePopover={() => setOpen(false)}
      ownFocus={false}
      panelPaddingSize="s"
      anchorPosition="upCenter"
      button={
        <span onMouseEnter={openNow} onMouseLeave={closeSoon} onFocus={openNow} onBlur={closeSoon}>
          {button}
        </span>
      }
      panelProps={{
        onMouseEnter: openNow,
        onMouseLeave: closeSoon,
      }}
    >
      <div style={{ minWidth: 200, maxWidth: 260 }}>
        <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
        {empty ? (
          <EuiText size="s">{empty}</EuiText>
        ) : (
          <EuiDescriptionList type="column" compressed listItems={items} />
        )}
      </div>
    </EuiPopover>
  );
}

const percent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return dash;
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const formatCls = (cls: number | null): string => (cls == null ? dash : cls.toFixed(3));

const vitalColor = (
  rating: RumVitalRating | null
): 'success' | 'warning' | 'danger' | 'subdued' => {
  if (rating === 'good') {
    return 'success';
  }
  if (rating === 'ni') {
    return 'warning';
  }
  if (rating === 'poor') {
    return 'danger';
  }
  return 'subdued';
};

const VitalCell = ({
  vital,
  value,
  format,
}: {
  vital: 'lcp' | 'inp' | 'cls';
  value: number | null;
  format: (next: number | null) => string;
}) => {
  const rating = rateVital(vital, value);
  return (
    <EuiText size="s" color={vitalColor(rating)}>
      {format(value)}
    </EuiText>
  );
};

const DeltaText = ({
  value,
  invert,
  format,
}: {
  value: number | null;
  invert?: boolean;
  format: (next: number) => string;
}) => {
  if (value == null || value === 0) {
    return null;
  }
  const worse = invert ? value > 0 : value < 0;
  return (
    <EuiText size="xs" color={worse ? 'danger' : 'success'}>
      {value > 0 ? '+' : ''}
      {format(value)}
    </EuiText>
  );
};

function InventoryKpis({
  apps,
  firingNames,
  showFiringAlerts,
}: {
  apps: RumAppInventoryRow[];
  firingNames: ReadonlySet<string>;
  showFiringAlerts: boolean;
}) {
  const kpis = rumAppsInventoryKpis(apps, firingNames);
  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxAppsKpiStrip">
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem>
          <EuiStat
            title={kpis.applications.toLocaleString()}
            description={i18n.translate('xpack.ux.inventory.applicationsStatLabel', {
              defaultMessage: 'Applications',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={kpis.sessions.toLocaleString()}
            description={i18n.translate('xpack.ux.inventory.sessionsStatLabel', {
              defaultMessage: 'Sessions',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={kpis.pageViews.toLocaleString()}
            description={i18n.translate('xpack.ux.inventory.pageViewsStatLabel', {
              defaultMessage: 'Page views',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={percent(kpis.errorRate)}
            description={i18n.translate('xpack.ux.inventory.errorRateStatLabel', {
              defaultMessage: 'Error rate',
            })}
            titleSize="s"
            titleColor={kpis.errorRate > ERROR_RATE_WARN ? 'danger' : undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={kpis.poorScoreApps.toLocaleString()}
            description={i18n.translate('xpack.ux.inventory.poorScoreStatLabel', {
              defaultMessage: 'Poor score',
            })}
            titleSize="s"
            titleColor={kpis.poorScoreApps > 0 ? 'danger' : undefined}
          />
        </EuiFlexItem>
        {showFiringAlerts ? (
          <EuiFlexItem>
            <EuiStat
              title={kpis.firingAlertApps.toLocaleString()}
              description={i18n.translate('xpack.ux.inventory.firingAlertsStatLabel', {
                defaultMessage: 'Firing alerts',
              })}
              titleSize="s"
              titleColor={kpis.firingAlertApps > 0 ? 'danger' : undefined}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function FacetFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: Array<{ key: string; label: string }>;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <EuiPopover
      aria-label={label}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setOpen((current) => !current)}
          isSelected={Boolean(value)}
          hasActiveFilters={Boolean(value)}
          numActiveFilters={value ? 1 : 0}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
    >
      <div style={{ maxHeight: 280, overflow: 'auto', minWidth: 180 }}>
        {options.map((option) => (
          <EuiFilterSelectItem
            key={option.key}
            checked={value === option.key ? 'on' : undefined}
            onClick={() => {
              onChange(value === option.key ? '' : option.key);
              setOpen(false);
            }}
          >
            {option.label}
          </EuiFilterSelectItem>
        ))}
      </div>
    </EuiPopover>
  );
}

const platformLabel = (platform: RumAppPlatform): string => {
  if (platform === 'android') {
    return androidLabel;
  }
  if (platform === 'ios') {
    return iosLabel;
  }
  return i18n.translate('xpack.ux.inventory.webPlatformLabel', { defaultMessage: 'Web' });
};

export function RumAppsPage() {
  const { http, docLinks } = useKibanaServices();
  const history = useHistory();
  const { search } = useLocation();
  const {
    rangeId,
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      includeBots,
      botUa,
      environment = ENVIRONMENT_ALL.value,
      platform,
    },
  } = useLegacyUrlParams();

  const [data, setData] = useState<RumAppsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firingNames, setFiringNames] = useState<Set<string>>(new Set());
  const [unscopedFiring, setUnscopedFiring] = useState(0);
  const [alertsAvailable, setAlertsAvailable] = useState(false);
  const [evidenceApp, setEvidenceApp] = useState<RumAppInventoryRow | null>(null);
  const [scoreApp, setScoreApp] = useState<RumAppInventoryRow | null>(null);
  const loadGen = useRef(0);
  const { addInspectorRequest } = useInspectorContext();
  const { hidden: chartHidden, toggle: toggleChart } = useInventoryChartVisibility();

  const load = useCallback(async () => {
    void rangeId;
    const gen = ++loadGen.current;
    setLoading(true);
    setError(null);
    const includeBotsQuery = typeof includeBots === 'string' ? includeBots : undefined;
    const botUaQuery = typeof botUa === 'string' ? botUa : undefined;
    try {
      const result = await fetchRumApps({
        http,
        rangeFrom,
        rangeTo,
        includeBots: includeBotsQuery,
        botUa: botUaQuery,
        stage: 'index',
      });
      if (loadGen.current !== gen) {
        return;
      }
      addInspectorRequest({ data: result, status: FETCH_STATUS.SUCCESS });
      setData(result);
      setLoading(false);
      if (!result.remainder) {
        return;
      }
      try {
        const live = await fetchRumApps({
          http,
          rangeFrom,
          rangeTo,
          includeBots: includeBotsQuery,
          botUa: botUaQuery,
          stage: 'remainder',
        });
        if (loadGen.current !== gen) {
          return;
        }
        addInspectorRequest({ data: live, status: FETCH_STATUS.SUCCESS });
        setData((current) => (current ? mergeRumAppsResponses(current, live) : live));
      } catch {
        // Keep the sessions-index rows if the open tail fails.
      }
    } catch (err) {
      if (loadGen.current !== gen) {
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      setLoading(false);
    }
    // rangeId refetches relative ranges like Last 24 hours
  }, [addInspectorRequest, http, rangeFrom, rangeTo, includeBots, botUa, rangeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      try {
        const status = await fetchRumAlertStatus(http);
        if (cancelled) {
          return;
        }
        setAlertsAvailable(status.available);
        if (!status.available) {
          return;
        }
        const alerts = await fetchRumAlerts(http);
        if (cancelled) {
          return;
        }
        setFiringNames(rumFiringServiceNames(alerts.rules, alerts.episodes));
        const latest = new Map<string, string | undefined>();
        for (const episode of alerts.episodes) {
          if (!episode.ruleId || latest.has(episode.ruleId)) {
            continue;
          }
          latest.set(episode.ruleId, episode.status);
        }
        setUnscopedFiring(
          alerts.rules.filter(
            (rule) =>
              !rule.serviceName &&
              (latest.get(rule.id) === 'active' || latest.get(rule.id) === 'pending')
          ).length
        );
      } catch {
        if (!cancelled) {
          setAlertsAvailable(false);
          setFiringNames(new Set());
          setUnscopedFiring(0);
        }
      }
    };
    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, [http]);

  const apps = useMemo(() => data?.apps ?? [], [data]);
  const includeBotsQuery = typeof includeBots === 'string' ? includeBots : undefined;
  const botUaQuery = typeof botUa === 'string' ? botUa : undefined;
  const { span, loading: spanLoading } = useRumAppsSpan({
    enabled: !loading && !error && apps.length === 0,
    http,
    rangeFrom,
    rangeTo,
    includeBots: includeBotsQuery,
    botUa: botUaQuery,
  });

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (platform && app.platform !== platform) {
        return false;
      }
      if (environment && environment !== ENVIRONMENT_ALL.value) {
        if (environment === ENVIRONMENT_NOT_DEFINED.value) {
          return app.environments.length === 0;
        }
        return app.environments.includes(environment);
      }
      return true;
    });
  }, [apps, environment, platform]);

  const fleetSessions = useMemo(() => apps.reduce((sum, app) => sum + app.sessions, 0), [apps]);

  const tourAppName = useMemo(() => {
    if (filteredApps.length === 0) {
      return undefined;
    }
    return [...filteredApps].sort((left, right) => right.sessions - left.sessions)[0]?.name;
  }, [filteredApps]);

  const environmentOptions = useMemo(() => {
    const names = new Set<string>();
    let hasUndefined = false;
    for (const app of apps) {
      if (app.environments.length === 0) {
        hasUndefined = true;
      }
      for (const name of app.environments) {
        names.add(name);
      }
    }
    const options = [...names].sort().map((name) => ({ key: name, label: name }));
    if (hasUndefined) {
      options.unshift({
        key: ENVIRONMENT_NOT_DEFINED.value,
        label: ENVIRONMENT_NOT_DEFINED.text,
      });
    }
    return options;
  }, [apps]);

  const platformOptions = useMemo(() => {
    const seen = new Set(apps.map((app) => app.platform));
    return (['web', 'android', 'ios'] as const)
      .filter((item) => seen.has(item))
      .map((item) => ({ key: item, label: platformLabel(item) }));
  }, [apps]);

  const patchSearch = useCallback(
    (patch: { environment?: string; platform?: string }) => {
      history.push({
        pathname: history.location.pathname,
        search: mergeRumSearch(search, patch),
      });
    },
    [history, search]
  );

  const onSelectSpanRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      history.push({
        pathname: history.location.pathname,
        search: mergeRumSearch(search, { rangeFrom: nextFrom, rangeTo: nextTo }),
      });
    },
    [history, search]
  );

  const openApp = useCallback(
    (serviceName: string) => {
      pushRumPath(history, '/', { serviceName });
    },
    [history]
  );

  const openAlerts = useCallback(
    (serviceName: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      pushRumPath(history, '/alerts', { serviceName });
    },
    [history]
  );

  const openEvidence = useCallback((app: RumAppInventoryRow, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setEvidenceApp(app);
  }, []);

  const allColumns = useMemo<InventoryTableColumn[]>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.ux.inventory.applicationColumnLabel', {
          defaultMessage: 'Application',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string, app) => {
          const investigateLabel = i18n.translate('xpack.ux.inventory.investigateAriaLabel', {
            defaultMessage: 'Investigate {name}',
            values: { name },
          });
          const href = history.createHref({
            pathname: uxAppPath(name),
            search: mergeRumSearch(search, { serviceName: '' }),
          });
          const investigateButton = (
            <EuiToolTip content={investigateLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={investigateLabel}
                data-test-subj={`uxAppInvestigate-${name}`}
                display="empty"
                iconType="inspect"
                onClick={(event: React.MouseEvent) => openEvidence(app, event)}
                size="s"
              />
            </EuiToolTip>
          );
          const row = (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {app.platform === 'android' ? (
                <EuiFlexItem grow={false}>
                  <AgentIcon agentName="android/java" size="s" title={androidLabel} />
                </EuiFlexItem>
              ) : null}
              {app.platform === 'ios' ? (
                <EuiFlexItem grow={false}>
                  <AgentIcon agentName="iOS/swift" size="s" title={iosLabel} />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiLink
                  data-test-subj={`uxAppLink-${name}`}
                  href={href}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                      return;
                    }
                    event.preventDefault();
                    openApp(name);
                  }}
                >
                  {name}
                </EuiLink>
              </EuiFlexItem>
              {firingNames.has(name) ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="danger"
                    data-test-subj={`uxAppFiringBadge-${name}`}
                    onClick={(event) => openAlerts(name, event)}
                    onClickAriaLabel={i18n.translate('xpack.ux.inventory.firingBadgeAriaLabel', {
                      defaultMessage: 'Open alerts for {name}',
                      values: { name },
                    })}
                  >
                    {i18n.translate('xpack.ux.inventory.firingBadgeLabel', {
                      defaultMessage: 'Firing',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                {name === tourAppName ? (
                  <UxTourAnchor stepId="investigate">{investigateButton}</UxTourAnchor>
                ) : (
                  investigateButton
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
          if (name !== tourAppName) {
            return row;
          }
          return <UxTourAnchor stepId="welcome">{row}</UxTourAnchor>;
        },
      },
      {
        id: 'score',
        field: 'score',
        name: scoreColumnLabel,
        sortable: true,
        width: '200px',
        render: (_score: number | null, app) => {
          const cell = <InventoryScoreCell app={app} onOpen={setScoreApp} />;
          if (app.name !== tourAppName) {
            return cell;
          }
          return <UxTourAnchor stepId="score">{cell}</UxTourAnchor>;
        },
      },
      {
        id: 'sessions',
        field: 'sessions',
        name: i18n.translate('xpack.ux.inventory.sessionsColumnLabel', {
          defaultMessage: 'Sessions',
        }),
        sortable: true,
        width: '110px',
        render: (sessions: number, app) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{sessions.toLocaleString()}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DeltaText value={app.sessionsDelta} format={(next) => `${Math.round(next)}`} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        id: 'pageViews',
        field: 'pageViews',
        name: i18n.translate('xpack.ux.inventory.pageViewsColumnLabel', {
          defaultMessage: 'Page views',
        }),
        selectorName: i18n.translate('xpack.ux.inventory.pageViewsColumnLabel', {
          defaultMessage: 'Page views',
        }),
        sortable: true,
        width: '110px',
        render: (pageViews: number) => pageViews.toLocaleString(),
      },
      {
        id: 'errorRate',
        field: 'errorRate',
        name: i18n.translate('xpack.ux.inventory.errorRateColumnLabel', {
          defaultMessage: 'Error rate',
        }),
        sortable: true,
        width: '120px',
        render: (errorRate: number, app) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color={errorRate > ERROR_RATE_WARN ? 'danger' : undefined}>
                {percent(errorRate)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DeltaText
                value={app.errorRateDelta}
                invert
                format={(next) => `${Math.round(next * 1000) / 10}%`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        id: 'lcp',
        field: 'p75Lcp',
        name: (
          <VitalColumnName
            label={i18n.translate('xpack.ux.inventory.lcpColumnLabel', { defaultMessage: 'LCP' })}
            tooltip={VITAL_P75_HELP.lcp}
          />
        ),
        selectorName: i18n.translate('xpack.ux.inventory.lcpColumnLabel', {
          defaultMessage: 'LCP',
        }),
        sortable: true,
        width: '100px',
        render: (value: number | null) => <VitalCell vital="lcp" value={value} format={formatMs} />,
      },
      {
        id: 'inp',
        field: 'p75Inp',
        name: (
          <VitalColumnName
            label={i18n.translate('xpack.ux.inventory.inpColumnLabel', { defaultMessage: 'INP' })}
            tooltip={VITAL_P75_HELP.inp}
          />
        ),
        selectorName: i18n.translate('xpack.ux.inventory.inpColumnLabel', {
          defaultMessage: 'INP',
        }),
        sortable: true,
        width: '100px',
        render: (value: number | null) => <VitalCell vital="inp" value={value} format={formatMs} />,
      },
      {
        id: 'cls',
        field: 'p75Cls',
        name: (
          <VitalColumnName
            label={i18n.translate('xpack.ux.inventory.clsColumnLabel', { defaultMessage: 'CLS' })}
            tooltip={VITAL_P75_HELP.cls}
          />
        ),
        selectorName: i18n.translate('xpack.ux.inventory.clsColumnLabel', {
          defaultMessage: 'CLS',
        }),
        sortable: true,
        width: '100px',
        render: (value: number | null) => (
          <VitalCell vital="cls" value={value} format={formatCls} />
        ),
      },
      {
        id: 'fcp',
        field: 'p75Fcp',
        name: (
          <VitalColumnName
            label={i18n.translate('xpack.ux.inventory.fcpColumnLabel', { defaultMessage: 'FCP' })}
            tooltip={VITAL_P75_HELP.fcp}
          />
        ),
        selectorName: i18n.translate('xpack.ux.inventory.fcpColumnLabel', {
          defaultMessage: 'FCP',
        }),
        sortable: true,
        width: '100px',
        render: (value: number | null) => formatMs(value),
      },
      {
        id: 'ttfb',
        field: 'p75Ttfb',
        name: (
          <VitalColumnName
            label={i18n.translate('xpack.ux.inventory.ttfbColumnLabel', { defaultMessage: 'TTFB' })}
            tooltip={VITAL_P75_HELP.ttfb}
          />
        ),
        selectorName: i18n.translate('xpack.ux.inventory.ttfbColumnLabel', {
          defaultMessage: 'TTFB',
        }),
        sortable: true,
        width: '100px',
        render: (value: number | null) => formatMs(value),
      },
      {
        id: 'opportunity',
        field: 'opportunity',
        name: opportunityColumnLabel,
        sortable: true,
        width: '120px',
        render: (value: number | null, app) => (
          <MetricHoverPopover
            title={opportunityColumnLabel}
            button={
              <EuiButtonEmpty
                flush="both"
                size="s"
                onClick={(event: React.MouseEvent) => openEvidence(app, event)}
                data-test-subj={`uxAppOpportunity-${app.name}`}
              >
                {value == null ? dash : value.toLocaleString()}
              </EuiButtonEmpty>
            }
            empty={value == null ? opportunityEmptyDescription : undefined}
            items={
              value == null
                ? undefined
                : [
                    {
                      title: i18n.translate('xpack.ux.inventory.opportunityShareLabel', {
                        defaultMessage: 'Session share',
                      }),
                      description: percent(fleetSessions > 0 ? app.sessions / fleetSessions : 0),
                    },
                    {
                      title: i18n.translate('xpack.ux.inventory.opportunityRoomLabel', {
                        defaultMessage: 'Room to 100',
                      }),
                      description: i18n.translate('xpack.ux.inventory.opportunityRoomDescription', {
                        defaultMessage: '{room} points',
                        values: { room: app.score == null ? 0 : 100 - app.score },
                      }),
                    },
                    {
                      title: i18n.translate('xpack.ux.inventory.opportunityWhyLabel', {
                        defaultMessage: 'Why it matters',
                      }),
                      description: opportunityWhyDescription,
                    },
                  ]
            }
          />
        ),
      },
    ],
    [firingNames, fleetSessions, history, openAlerts, openApp, openEvidence, search, tourAppName]
  );

  const [columns, columnSelector] = useInventoryColumnSelector(allColumns);

  return (
    <UxInventoryChrome tab="applications" isPageDataLoaded={!loading}>
      <div data-test-subj="uxPerformanceSummary">
        {error ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('xpack.ux.inventory.loadErrorTitle', {
              defaultMessage: 'Unable to load applications',
            })}
          >
            <p>{error}</p>
            <EuiButton
              data-test-subj="uxAppsRetryButton"
              color="danger"
              onClick={() => void load()}
            >
              {i18n.translate('xpack.ux.inventory.retryButtonLabel', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          </EuiCallOut>
        ) : (
          <>
            {unscopedFiring > 0 ? (
              <>
                <EuiCallOut
                  announceOnMount
                  color="warning"
                  title={i18n.translate('xpack.ux.inventory.unscopedFiringTitle', {
                    defaultMessage:
                      '{count, plural, one {# fleet-wide alert is firing} other {# fleet-wide alerts are firing}}',
                    values: { count: unscopedFiring },
                  })}
                />
                <EuiSpacer />
              </>
            ) : null}
            {data || !loading ? (
              <>
                <InventoryKpis
                  apps={filteredApps}
                  firingNames={firingNames}
                  showFiringAlerts={alertsAvailable}
                />
                <EuiSpacer />
                {!chartHidden && (apps.length > 0 || (data?.sessionTraffic ?? []).length > 0) ? (
                  <>
                    <SessionTrafficChart points={data?.sessionTraffic ?? []} onHide={toggleChart} />
                    <EuiSpacer />
                  </>
                ) : null}
              </>
            ) : null}
            {loading && !data ? (
              <>
                <UxTourInventoryState status="loading" />
                <EmptyStateLoading
                  message={i18n.translate('xpack.ux.inventory.loadingMessage', {
                    defaultMessage: 'Loading applications…',
                  })}
                />
              </>
            ) : !loading && apps.length === 0 ? (
              <>
                <UxTourInventoryState status="empty" />
                <InventoryEmptyState
                  span={span}
                  spanLoading={spanLoading}
                  onSelectRange={onSelectSpanRange}
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  http={http}
                  docLinks={docLinks}
                />
              </>
            ) : (
              <>
                <UxTourInventoryState status="ready" />
                <EuiInMemoryTable
                  data-test-subj="uxAppsTable"
                  tableCaption={i18n.translate('xpack.ux.inventory.tableCaption', {
                    defaultMessage: 'Applications',
                  })}
                  items={filteredApps}
                  columns={columns as Array<EuiBasicTableColumn<RumAppInventoryRow>>}
                  loading={loading}
                  noItemsMessage={i18n.translate('xpack.ux.inventory.noMatchingAppsMessage', {
                    defaultMessage: 'No applications match the current filters.',
                  })}
                  sorting={{ sort: { field: 'sessions', direction: 'desc' } }}
                  pagination={{ pageSize: 25, showPerPageOptions: false }}
                  search={{
                    box: {
                      incremental: true,
                      placeholder: i18n.translate('xpack.ux.inventory.searchPlaceholder', {
                        defaultMessage: 'Search applications',
                      }),
                    },
                    toolsLeft: (
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        {chartHidden ? (
                          <EuiFlexItem grow={false}>
                            <EuiToolTip content={showChartLabel} disableScreenReaderOutput>
                              <EuiButtonIcon
                                iconType="transitionTopIn"
                                aria-label={showChartLabel}
                                onClick={toggleChart}
                                data-test-subj="uxAppsShowChartButton"
                              />
                            </EuiToolTip>
                          </EuiFlexItem>
                        ) : null}
                        <EuiFlexItem grow={false}>
                          <EuiFilterGroup>
                            <FacetFilter
                              label={i18n.translate('xpack.ux.inventory.environmentFilterLabel', {
                                defaultMessage: 'Environment',
                              })}
                              value={
                                environment === ENVIRONMENT_ALL.value ? undefined : environment
                              }
                              options={environmentOptions}
                              onChange={(next) =>
                                patchSearch({
                                  environment: next || ENVIRONMENT_ALL.value,
                                })
                              }
                            />
                            <FacetFilter
                              label={i18n.translate('xpack.ux.inventory.platformFilterLabel', {
                                defaultMessage: 'Platform',
                              })}
                              value={platform}
                              options={platformOptions}
                              onChange={(next) => patchSearch({ platform: next })}
                            />
                          </EuiFilterGroup>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                    toolsRight: <>{columnSelector}</>,
                  }}
                  rowProps={(app) => ({
                    'data-test-subj': `uxAppRow-${app.name}`,
                    onClick: (event: React.MouseEvent) => {
                      if ((event.target as HTMLElement).closest('a, button, [role="button"]')) {
                        return;
                      }
                      openApp(app.name);
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              </>
            )}
          </>
        )}
      </div>
      {scoreApp ? <ScoreBreakdownFlyout app={scoreApp} onClose={() => setScoreApp(null)} /> : null}
      {evidenceApp ? (
        <EvidencePackFlyout
          app={evidenceApp}
          firing={firingNames.has(evidenceApp.name)}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          includeBots={typeof includeBots === 'string' ? includeBots : undefined}
          botUa={typeof botUa === 'string' ? botUa : undefined}
          onClose={() => setEvidenceApp(null)}
        />
      ) : null}
    </UxInventoryChrome>
  );
}
