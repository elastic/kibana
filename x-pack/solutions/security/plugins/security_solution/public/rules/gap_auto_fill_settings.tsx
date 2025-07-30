/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  EuiSwitch,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiFieldNumber,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiTable,
  EuiTableHeaderCell,
  EuiTableRowCell,
  EuiTableBody,
  EuiTableHeader,
  EuiTableRow,
  EuiPagination,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { KibanaServices } from '../common/lib/kibana';

interface GapAutoFillConfig {
  name: string;
  maxAmountOfGapsToProcessPerRun: number;
  maxAmountOfRulesToProcessPerRun: number;
  amountOfRetries: number;
  rulesFilter: string;
  gapFillRange: string;
  schedule: {
    interval: string;
  };
}

interface GapAutoFillLastRun {
  results: Array<{
    ruleId: string;
    processedGaps: number;
    status: 'success' | 'error';
    error?: string;
  }>;
  status: 'success' | 'error';
  error?: string;
  date: string;
}

interface GapAutoFill {
  id: string;
  enabled: boolean;
  name?: string;
  status?: string;
  lastRun?: string;
  runAt?: string;
  scheduledAt?: string;
  state?: {
    config?: GapAutoFillConfig;
    lastRun?: GapAutoFillLastRun | null;
  };
}

interface GapFillEventLog {
  _id: string;
  _index: string;
  '@timestamp': string;
  event: {
    action: string;
  };
  kibana: {
    auto_gap_fill: {
      execution: {
        uuid: string;
        status: 'success' | 'error';
        start: string;
        end: string;
        duration_ms: number;
        config: GapAutoFillConfig;
        results: Array<{
          ruleId: string;
          processedGaps: number;
          status: 'success' | 'error';
          error?: string;
        }>;
        summary: {
          totalRules: number;
          successfulRules: number;
          failedRules: number;
          totalGapsProcessed: number;
        };
      };
    };
    task: {
      id: string;
      scheduled: string;
      schedule_delay: number;
    };
  };
  message: string;
}

interface EventLogResponse {
  data: GapFillEventLog[];
  total: number;
  page: number;
  perPage: number;
}

// Event Logs Component
const EventLogsComponent: React.FC<{ autoFillId: string }> = ({ autoFillId }) => {
  const [eventLogs, setEventLogs] = useState<GapFillEventLog[]>([]);
  const [eventLogsLoading, setEventLogsLoading] = useState(false);
  const [eventLogsError, setEventLogsError] = useState<string | null>(null);
  const [eventLogsPagination, setEventLogsPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
  });

  // Fetch event logs
  const fetchEventLogs = useCallback(async () => {
    setEventLogsLoading(true);
    setEventLogsError(null);
    try {
      const response = await KibanaServices.get().http.get<EventLogResponse>(
        `/internal/alerting/rules/gaps/auto_fill_scheduler/${autoFillId}/logs`
      );
      setEventLogs(response.data);
      setEventLogsPagination((prev) => ({ ...prev, total: response.total }));
    } catch (err) {
      setEventLogsError('Failed to load event logs');
    } finally {
      setEventLogsLoading(false);
    }
  }, [autoFillId]);

  // Fetch event logs when component mounts
  useEffect(() => {
    fetchEventLogs();
  }, [fetchEventLogs]);

  return (
    <>
      <EuiSpacer size="m" />

      <EuiTitle size="s">
        <h3>{'Event Logs'}</h3>
      </EuiTitle>

      {eventLogsLoading && <EuiLoadingSpinner size="m" />}
      {eventLogsError && <EuiCallOut color="danger" title={eventLogsError} />}

      {!eventLogsLoading && eventLogs.length === 0 && (
        <EuiText size="s" color="subdued">
          {'No event logs found.'}
        </EuiText>
      )}

      {!eventLogsLoading && eventLogs.length > 0 && (
        <EuiTable compressed>
          <EuiTableHeader>
            <EuiTableRow>
              <EuiTableHeaderCell>{'Timestamp'}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{'Action'}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{'Status'}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{'Message'}</EuiTableHeaderCell>
            </EuiTableRow>
          </EuiTableHeader>
          <EuiTableBody>
            {eventLogs.map((log) => (
              <EuiTableRow key={log._id}>
                <EuiTableRowCell>{new Date(log['@timestamp']).toLocaleString()}</EuiTableRowCell>
                <EuiTableRowCell>{log.event.action}</EuiTableRowCell>
                <EuiTableRowCell>
                  <EuiBadge
                    color={
                      log.kibana.auto_gap_fill.execution.status === 'success' ? 'success' : 'danger'
                    }
                  >
                    {log.kibana.auto_gap_fill.execution.status}
                  </EuiBadge>
                </EuiTableRowCell>
                <EuiTableRowCell>{log.message}</EuiTableRowCell>
              </EuiTableRow>
            ))}
          </EuiTableBody>
        </EuiTable>
      )}

      {eventLogsPagination.total > eventLogsPagination.perPage && <EuiSpacer size="s" />}
      {eventLogsPagination.total > eventLogsPagination.perPage && (
        <EuiPagination
          pageCount={Math.ceil(eventLogsPagination.total / eventLogsPagination.perPage)}
          activePage={eventLogsPagination.page - 1}
          onPageClick={(page) => setEventLogsPagination((prev) => ({ ...prev, page: page + 1 }))}
          compressed
        />
      )}
    </>
  );
};

export const GapAutoFillSettings: React.FC = () => {
  const [autoFill, setAutoFill] = useState<GapAutoFill | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('');
  const [maxAmountOfGapsToProcessPerRun, setMaxAmountOfGapsToProcessPerRun] = useState(100);
  const [maxAmountOfRulesToProcessPerRun, setMaxAmountOfRulesToProcessPerRun] = useState(50);
  const [amountOfRetries, setAmountOfRetries] = useState(3);
  const [rulesFilter, setRulesFilter] = useState('');
  const [gapFillRange, setGapFillRange] = useState('now-7d');
  const [schedule, setSchedule] = useState('1m');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalValues, setOriginalValues] = useState({
    name: '',
    maxAmountOfGapsToProcessPerRun: 100,
    maxAmountOfRulesToProcessPerRun: 100,
    amountOfRetries: 3,
    rulesFilter: '',
    gapFillRange: 'now-7d',
    schedule: '1m',
  });

  const AUTO_FILL_ID = 'default';

  // Fetch auto fill on mount
  useEffect(() => {
    fetchAutoFill();
  }, []);

  const fetchAutoFill = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await KibanaServices.get().http.get<GapAutoFill>(
        `/internal/alerting/rules/gaps/auto_fill_scheduler/${AUTO_FILL_ID}`
      );
      setAutoFill(data);
      setEnabled(data.enabled);

      const config = data.state?.config;
      if (config) {
        setName(config.name || 'Gap Auto-Fill');
        setMaxAmountOfGapsToProcessPerRun(config.maxAmountOfGapsToProcessPerRun || 100);
        setMaxAmountOfRulesToProcessPerRun(config.maxAmountOfRulesToProcessPerRun || 50);
        setAmountOfRetries(config.amountOfRetries || 3);
        setRulesFilter(config.rulesFilter || '');
        setGapFillRange(config.gapFillRange || 'now-7d');
        setSchedule(config.schedule?.interval || '1m');
      } else {
        setName('Gap Auto-Fill');
        setMaxAmountOfGapsToProcessPerRun(100);
        setMaxAmountOfRulesToProcessPerRun(50);
        setAmountOfRetries(3);
        setRulesFilter('');
        setGapFillRange('now-7d');
        setSchedule('1m');
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { status?: number } };
      if (errorResponse?.response?.status === 404) {
        // Auto fill doesn't exist yet
        setAutoFill(null);
        setEnabled(false);
        setName('Gap Auto-Fill');
        setMaxAmountOfGapsToProcessPerRun(100);
        setMaxAmountOfRulesToProcessPerRun(50);
        setAmountOfRetries(3);
        setRulesFilter('');
        setGapFillRange('now-7d');
        setSchedule('1m');
      } else {
        setError('Failed to load auto fill status');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle switch toggle - creates auto fill if it doesn't exist, or enables/disables if it does
  const handleSwitchToggle = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!autoFill) {
        // Auto fill doesn't exist - create it
        await KibanaServices.get().http.post('/internal/alerting/rules/gaps/auto_fill_scheduler', {
          body: JSON.stringify({
            name: 'Gap Auto-Fill',
            maxAmountOfGapsToProcessPerRun: 100,
            maxAmountOfRulesToProcessPerRun: 50,
            amountOfRetries: 3,
            rulesFilter: '',
            gapFillRange: 'now-7d',
            schedule: {
              interval: '1m',
            },
          }),
        });
        // Fetch the newly created auto fill
        await fetchAutoFill();
      } else {
        // Auto fill exists - toggle enable/disable
        await KibanaServices.get().http.put(
          `/internal/alerting/rules/gaps/auto_fill_scheduler/${AUTO_FILL_ID}`,
          {
            body: JSON.stringify({ enabled: !enabled }),
          }
        );
        setEnabled(!enabled);
      }
    } catch (err) {
      setError('Failed to update auto fill status');
    } finally {
      setSaving(false);
    }
  };

  // Start editing mode
  const handleEdit = () => {
    setOriginalValues({
      name,
      maxAmountOfGapsToProcessPerRun,
      maxAmountOfRulesToProcessPerRun,
      amountOfRetries,
      rulesFilter,
      gapFillRange,
      schedule,
    });
    setIsEditing(true);
  };

  // Cancel editing mode
  const handleCancel = () => {
    setName(originalValues.name);
    setMaxAmountOfGapsToProcessPerRun(originalValues.maxAmountOfGapsToProcessPerRun);
    setMaxAmountOfRulesToProcessPerRun(originalValues.maxAmountOfRulesToProcessPerRun);
    setAmountOfRetries(originalValues.amountOfRetries);
    setRulesFilter(originalValues.rulesFilter);
    setGapFillRange(originalValues.gapFillRange);
    setSchedule(originalValues.schedule);
    setIsEditing(false);
  };

  // Save configuration
  const handleSave = async () => {
    if (!autoFill) return;

    setSaving(true);
    setError(null);
    try {
      await KibanaServices.get().http.put(
        `/internal/alerting/rules/gaps/auto_fill_scheduler/${AUTO_FILL_ID}`,
        {
          body: JSON.stringify({
            name,
            maxAmountOfGapsToProcessPerRun,
            maxAmountOfRulesToProcessPerRun,
            amountOfRetries,
            rulesFilter,
            gapFillRange,
            schedule: {
              interval: schedule,
            },
          }),
        }
      );
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update auto fill configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>{'Loading...'}</div>;
  }

  const lastRun = autoFill?.state?.lastRun;
  const config = autoFill?.state?.config;

  return (
    <EuiPanel>
      <EuiTitle size="m">
        <h2>{'Gap Auto-Fill Settings'}</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      {error && (
        <>
          <EuiCallOut color="danger" title={error} />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFormRow label="Enable Auto-Fill">
        <EuiSwitch
          label={autoFill ? (enabled ? 'Enabled' : 'Disabled') : 'Create and Enable Auto-Fill'}
          checked={enabled}
          onChange={handleSwitchToggle}
          disabled={saving}
          showLabel={true}
        />
      </EuiFormRow>

      {autoFill && (
        <>
          <EuiSpacer size="m" />

          {!isEditing ? (
            // View mode
            <>
              <EuiDescriptionList type="column" compressed>
                <EuiDescriptionListTitle>{'Name'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{name}</EuiDescriptionListDescription>

                <EuiDescriptionListTitle>{'Max gaps per run'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {maxAmountOfGapsToProcessPerRun}
                </EuiDescriptionListDescription>

                <EuiDescriptionListTitle>{'Max rules per run'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {maxAmountOfRulesToProcessPerRun}
                </EuiDescriptionListDescription>

                <EuiDescriptionListTitle>{'Retries'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{amountOfRetries}</EuiDescriptionListDescription>

                <EuiDescriptionListTitle>{'Rules Filter'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {rulesFilter || 'None'}
                </EuiDescriptionListDescription>

                <EuiDescriptionListTitle>{'Gap Fill Range'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{gapFillRange}</EuiDescriptionListDescription>

                <EuiDescriptionListTitle>{'Schedule'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{schedule}</EuiDescriptionListDescription>
              </EuiDescriptionList>

              <EuiSpacer size="m" />

              <EuiButton onClick={handleEdit} disabled={saving}>
                {'Edit Configuration'}
              </EuiButton>
            </>
          ) : (
            // Edit mode
            <>
              <EuiFormRow label="Name">
                <EuiFieldText
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiFormRow label="Max gaps per run">
                <EuiFieldNumber
                  value={maxAmountOfGapsToProcessPerRun}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMaxAmountOfGapsToProcessPerRun(Number(e.target.value))
                  }
                  disabled={saving}
                  min={1}
                  max={1000}
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiFormRow label="Max rules per run">
                <EuiFieldNumber
                  value={maxAmountOfRulesToProcessPerRun}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMaxAmountOfRulesToProcessPerRun(Number(e.target.value))
                  }
                  disabled={saving}
                  min={1}
                  max={1000}
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiFormRow label="Retries">
                <EuiFieldNumber
                  value={amountOfRetries}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAmountOfRetries(Number(e.target.value))
                  }
                  disabled={saving}
                  min={0}
                  max={10}
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiFormRow label="Rules Filter">
                <EuiFieldText
                  value={rulesFilter}
                  onChange={(e) => setRulesFilter(e.target.value)}
                  disabled={saving}
                  placeholder="Enter KQL filter for rules (e.g., alert.name: *test*)"
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiFormRow label="Gap Fill Range">
                <EuiFieldText
                  value={gapFillRange}
                  onChange={(e) => setGapFillRange(e.target.value)}
                  disabled={saving}
                  placeholder="e.g., now-7d, now-1h"
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiFormRow label="Schedule">
                <EuiFieldText
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  disabled={saving}
                  placeholder="e.g., 1m, 5m, 1h"
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={handleSave} disabled={saving} fill>
                    {'Save'}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={handleCancel} disabled={saving}>
                    {'Cancel'}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}

          <EuiSpacer size="m" />

          <EuiText size="s" color="subdued">
            <p>
              <strong>{'Status:'}</strong> {autoFill.status || 'Unknown'}
            </p>
            <p>
              <strong>{'Next Run:'}</strong>{' '}
              {(() => {
                if (!enabled) return 'Disabled';
                const nextRunDate = autoFill.runAt || autoFill.scheduledAt;
                return nextRunDate ? new Date(nextRunDate).toLocaleString() : 'Not scheduled';
              })()}
            </p>
            {lastRun && (
              <>
                <p>
                  <strong>{'Last Run:'}</strong> {new Date(lastRun.date).toLocaleString()}
                </p>
                <p>
                  <strong>{'Last Run Status:'}</strong>{' '}
                  <EuiBadge color={lastRun.status === 'success' ? 'success' : 'danger'}>
                    {lastRun.status}
                  </EuiBadge>
                </p>
                {lastRun.error && (
                  <p>
                    <strong>{'Last Run Error:'}</strong> {lastRun.error}
                  </p>
                )}
                {lastRun.results.length > 0 && (
                  <>
                    <p>
                      <strong>{'Last Run Results:'}</strong>
                    </p>
                    <ul>
                      {lastRun.results.map((result, index) => (
                        <li key={index}>
                          {'Rule'} {result.ruleId} {':'} {result.processedGaps} {'gaps processed -'}{' '}
                          <EuiBadge color={result.status === 'success' ? 'success' : 'danger'}>
                            {result.status}
                          </EuiBadge>
                          {result.error && ` (${result.error})`}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </EuiText>

          <EventLogsComponent autoFillId={AUTO_FILL_ID} />
        </>
      )}
    </EuiPanel>
  );
};
