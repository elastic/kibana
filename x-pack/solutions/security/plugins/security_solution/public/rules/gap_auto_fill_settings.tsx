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
  max_amount_of_gaps_to_process_per_run: number;
  max_amount_of_rules_to_process_per_run: number;
  amount_of_retries: number;
  rules_filter: string;
  gap_fill_range: string;
  schedule: {
    interval: string;
  };
  scope?: string[];
  rule_types?: Array<{
    type: string;
    consumer: string;
  }>;
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
  name: string;
  schedule: {
    interval: string;
  };
  rules_filter: string;
  gap_fill_range: string;
  max_amount_of_gaps_to_process_per_run: number;
  max_amount_of_rules_to_process_per_run: number;
  amount_of_retries: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  last_run?: {
    status: 'success' | 'error';
    message: string;
    metrics: {
      totalRules: number;
      successfulRules: number;
      failedRules: number;
      totalGapsProcessed: number;
    };
  } | null;
  scheduled_task_id: string;
}

// Generic event log interface since the API returns Record<string, unknown>
interface GapFillLogEntry {
  timestamp: string;
  status: 'success' | 'error' | 'warning' | 'unknown';
  message: string;
  duration_ms: number;
  summary: {
    total_rules: number;
    successful_rules: number;
    failed_rules: number;
    total_gaps_processed: number;
  };
}

interface EventLogResponse {
  data: GapFillLogEntry[];
  total: number;
  page: number;
  per_page: number;
}

// Event Logs Component
const EventLogsComponent: React.FC<{ autoFillId: string }> = ({ autoFillId }) => {
  const [eventLogs, setEventLogs] = useState<GapFillLogEntry[]>([]);
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
        `/internal/alerting/rules/gaps/gap_auto_fill_scheduler/${autoFillId}/logs`
      );
      setEventLogs(response.data);
      setEventLogsPagination((prev) => ({
        ...prev,
        total: response.total,
        perPage: response.per_page,
      }));
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
              <EuiTableHeaderCell>{'Status'}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{'Message'}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{'Duration'}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{'Summary'}</EuiTableHeaderCell>
            </EuiTableRow>
          </EuiTableHeader>
          <EuiTableBody>
            {eventLogs.map((log, idx) => (
              <EuiTableRow key={`${log.timestamp}-${idx}`}>
                <EuiTableRowCell>{new Date(log.timestamp).toLocaleString()}</EuiTableRowCell>
                <EuiTableRowCell>
                  <EuiBadge
                    color={
                      log.status === 'success'
                        ? 'success'
                        : log.status === 'warning'
                        ? 'warning'
                        : log.status === 'error'
                        ? 'danger'
                        : 'hollow'
                    }
                  >
                    {log.status}
                  </EuiBadge>
                </EuiTableRowCell>
                <EuiTableRowCell>{log.message}</EuiTableRowCell>
                <EuiTableRowCell>{`${log.duration_ms} ms`}</EuiTableRowCell>
                <EuiTableRowCell>{`${log.summary.successful_rules}/${log.summary.total_rules} ok, ${log.summary.failed_rules} failed, ${log.summary.total_gaps_processed} gaps`}</EuiTableRowCell>
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
        `/internal/alerting/rules/gaps/gap_auto_fill_scheduler/${AUTO_FILL_ID}`
      );
      setAutoFill(data);
      setEnabled(data.enabled);

      // Map the new API response structure to our local state
      setName(data.name || 'Gap Auto-Fill');
      setMaxAmountOfGapsToProcessPerRun(data.max_amount_of_gaps_to_process_per_run || 100);
      setMaxAmountOfRulesToProcessPerRun(data.max_amount_of_rules_to_process_per_run || 50);
      setAmountOfRetries(data.amount_of_retries || 3);
      setRulesFilter(data.rules_filter || '');
      setGapFillRange(data.gap_fill_range || 'now-7d');
      setSchedule(data.schedule?.interval || '1m');
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
        // Auto fill doesn't exist - create it with new API structure
        await KibanaServices.get().http.post(
          '/internal/alerting/rules/gaps/gap_auto_fill_scheduler',
          {
            body: JSON.stringify({
              name: 'Gap Auto-Fill',
              max_amount_of_gaps_to_process_per_run: 100,
              max_amount_of_rules_to_process_per_run: 50,
              amount_of_retries: 3,
              rules_filter: '',
              gap_fill_range: 'now-7d',
              schedule: {
                interval: '30s',
              },
              scope: ['securitySolution'],
              rule_types: [
                {
                  type: '.siem-signal',
                  consumer: 'siem',
                },
              ],
              id: 'default',
            }),
          }
        );
        // Fetch the newly created auto fill
        await fetchAutoFill();
      } else {
        // Auto fill exists - toggle enable/disable
        const data = await KibanaServices.get().http.put<GapAutoFill>(
          `/internal/alerting/rules/gaps/gap_auto_fill_scheduler/${AUTO_FILL_ID}`,
          {
            body: JSON.stringify({ enabled: !enabled }),
          }
        );
        setAutoFill(data);
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
      const data = await KibanaServices.get().http.put<GapAutoFill>(
        `/internal/alerting/rules/gaps/gap_auto_fill_scheduler/${AUTO_FILL_ID}`,
        {
          body: JSON.stringify({
            name,
            max_amount_of_gaps_to_process_per_run: maxAmountOfGapsToProcessPerRun,
            max_amount_of_rules_to_process_per_run: maxAmountOfRulesToProcessPerRun,
            amount_of_retries: amountOfRetries,
            rules_filter: rulesFilter,
            gap_fill_range: gapFillRange,
            schedule: {
              interval: schedule,
            },
          }),
        }
      );
      setAutoFill(data);
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

                <EuiDescriptionListTitle>{'Scheduled Task ID'}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {autoFill.scheduled_task_id}
                </EuiDescriptionListDescription>

                {autoFill.created_by && (
                  <>
                    <EuiDescriptionListTitle>{'Created By'}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      {autoFill.created_by}
                    </EuiDescriptionListDescription>
                  </>
                )}

                {autoFill.updated_by && (
                  <>
                    <EuiDescriptionListTitle>{'Updated By'}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      {autoFill.updated_by}
                    </EuiDescriptionListDescription>
                  </>
                )}
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
                  max={10000}
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
                  max={10000}
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
                  min={1}
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
              <strong>{'Created:'}</strong> {new Date(autoFill.created_at).toLocaleString()}
            </p>
            <p>
              <strong>{'Last Updated:'}</strong> {new Date(autoFill.updated_at).toLocaleString()}
            </p>
          </EuiText>

          <EventLogsComponent autoFillId={AUTO_FILL_ID} />
        </>
      )}
    </EuiPanel>
  );
};
