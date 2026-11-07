/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  transparentize,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IntelligencePanel } from '../components';
import { AgentOutcome, AgentTimestamp } from './agent_evidence';
import type { CodexToolEvent } from './codex_types';
import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import { FindingDetails } from '../security_findings/security_findings_panel';
import { securityGraphOutcome, SecurityGraphSummary } from './security_graph_nodes';
import {
  findingMatchesToolEvent,
  readableSecurityFindings,
  securityFindingKey,
  securityInvocationCommand,
} from './security_graph_model';

export const formatCodexDuration = (duration?: number): string => {
  if (duration === undefined) return '—';
  if (duration < 1000) return `${Math.round(duration).toLocaleString()} ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)} s`;
  return `${(duration / 60000).toFixed(1)} min`;
};

export const CodexSessionTrail: React.FC<{
  events: CodexToolEvent[];
  complete: boolean;
  security?: SecurityFindingsResult;
  toolFilter?: string;
  onToolFilterChange?: (tool: string) => void;
  onInspect: (event: CodexToolEvent) => void;
}> = ({ events, complete, security, onInspect, toolFilter, onToolFilterChange }) => {
  const { euiTheme } = useEuiTheme();
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('all');
  const [selectedFindingKey, setSelectedFindingKey] = useState<string>();
  const findings = readableSecurityFindings(security);
  const selectedFinding = findings.find(
    (finding) =>
      securityFindingKey(finding) === selectedFindingKey &&
      events.some((event) => findingMatchesToolEvent(finding, event))
  );
  useEffect(() => {
    if (selectedFindingKey && !selectedFinding) setSelectedFindingKey(undefined);
  }, [selectedFindingKey, selectedFinding]);
  const eventFindings = (event: CodexToolEvent): SecurityFinding[] =>
    findings.filter((finding) => findingMatchesToolEvent(finding, event));
  const [localTool, setLocalTool] = useState('');
  const tool = toolFilter ?? localTool;
  const setTool = onToolFilterChange ?? setLocalTool;
  const [bucket, setBucket] = useState<number>();
  const tools = useMemo(
    () => [...new Set([...events.map((event) => event.toolName), ...(tool ? [tool] : [])])].sort(),
    [events, tool]
  );
  const bins = useMemo(() => {
    const timestamps = events.map((event) => Date.parse(event.timestamp));
    const start = timestamps.length ? Math.min(...timestamps) : 0;
    const width = Math.max(1, (Math.max(start, ...timestamps) - start + 1) / 36);
    return Array.from({ length: 36 }, (_, index) => ({
      start: start + index * width,
      end: start + (index + 1) * width,
      events: events.filter((event) => {
        const time = Date.parse(event.timestamp);
        return time >= start + index * width && time < start + (index + 1) * width;
      }),
    }));
  }, [events]);
  const maxBin = Math.max(1, ...bins.map((bin) => bin.events.length));
  const filtered = events.filter(
    (event) =>
      (!search ||
        `${event.toolName} ${event.id} ${event.input?.text ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (outcome === 'all' ||
        (outcome === 'security' ? eventFindings(event).length > 0 : event.outcome === outcome)) &&
      (!tool || event.toolName === tool) &&
      (bucket === undefined ||
        (Date.parse(event.timestamp) >= bins[bucket].start &&
          Date.parse(event.timestamp) < bins[bucket].end))
  );
  const columns: Array<EuiBasicTableColumn<CodexToolEvent>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.trail.time', {
        defaultMessage: 'Observed at',
      }),
      sortable: true,
      width: '220px',
      render: (value: string) => <AgentTimestamp value={value} />,
    },
    {
      field: 'toolName',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.trail.tool', {
        defaultMessage: 'Tool interaction',
      }),
      sortable: true,
      render: (name: string, event: CodexToolEvent) => (
        <div>
          <EuiLink onClick={() => onInspect(event)}>{name}</EuiLink>
          <EuiText size="xs" color="subdued">
            <p>
              {event.observationType === 'native_tool_completion'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.native',
                    { defaultMessage: 'Runtime completion' }
                  )
                : event.observationType === 'model_tool_call'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.modelCall',
                    { defaultMessage: 'Model call' }
                  )
                : event.toolType}
              {' · '}
              {event.input
                ? securityInvocationCommand(event.input.text).replace(/\s+/g, ' ').slice(0, 100)
                : event.id.slice(0, 18)}
            </p>
          </EuiText>
          {eventFindings(event).map((finding) => (
            <div key={securityFindingKey(finding)}>
              <EuiButtonEmpty
                size="xs"
                iconType="shield"
                color={finding.outcome === 'blocked' ? 'primary' : 'danger'}
                onClick={() => setSelectedFindingKey(securityFindingKey(finding))}
                data-test-subj="toolActivitySecurityFinding"
              >
                {securityGraphOutcome(finding)}
                {' · '}
                {finding.policy?.name ?? finding.rule.name}
              </EuiButtonEmpty>
            </div>
          ))}
        </div>
      ),
    },
    {
      field: 'outcome',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.outcome',
        { defaultMessage: 'Outcome' }
      ),
      width: '170px',
      render: (value: CodexToolEvent['outcome']) => <AgentOutcome outcome={value} />,
    },
    {
      field: 'durationMs',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.duration',
        { defaultMessage: 'Recorded duration' }
      ),
      sortable: true,
      width: '140px',
      render: (value?: number) => formatCodexDuration(value),
    },
  ];
  return (
    <IntelligencePanel data-test-subj="codexSessionTrail">
      <EuiTitle size="s">
        <h3>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.activityTitle',
            { defaultMessage: 'Tool activity' }
          )}
        </h3>
      </EuiTitle>
      {security && (security.isLoading || security.isRefreshing || security.unavailable) && (
        <SecurityGraphSummary result={security} />
      )}
      {findings.length > 0 && (
        <EuiBadge color="hollow">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.exactFindings',
            {
              defaultMessage:
                '{count, plural, one {# tool call with linked findings} other {# tool calls with linked findings}}',
              values: { count: events.filter((event) => eventFindings(event).length > 0).length },
            }
          )}
        </EuiBadge>
      )}
      <EuiSpacer size="m" />
      <div
        css={css`
          display: flex;
          gap: 3px;
          align-items: end;
          height: 80px;
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        {bins.map((bin, index) => {
          const failures = bin.events.filter((event) => event.outcome === 'failure').length;
          const label = i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.interval',
            {
              defaultMessage:
                '{count, number} observations, {failures, number} failures, starting {time}',
              values: {
                count: bin.events.length,
                failures,
                time: new Date(bin.start).toLocaleTimeString(),
              },
            }
          );
          return (
            <div
              key={index}
              css={css`
                flex: 1;
                min-width: 0;
              `}
            >
              <EuiToolTip content={label} display="block">
                <button
                  type="button"
                  disabled={!bin.events.length}
                  aria-label={label}
                  aria-pressed={bucket === index}
                  onClick={() => setBucket(bucket === index ? undefined : index)}
                  css={css`
                    width: 100%;
                    padding: 0;
                    border: none;
                    border-radius: ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0
                      0;
                    cursor: pointer;
                    background: ${transparentize(
                      euiTheme.colors.primary,
                      bucket === index ? 0.9 : 0.45
                    )};
                    display: flex;
                    flex-direction: column;
                    justify-content: end;
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                      outline-offset: 2px;
                    }
                  `}
                  style={{ height: Math.max(3, (bin.events.length / maxBin) * 80) }}
                >
                  <span
                    css={css`
                      width: 100%;
                      background: ${euiTheme.colors.danger};
                    `}
                    style={{
                      height: `${bin.events.length ? (failures / bin.events.length) * 100 : 0}%`,
                    }}
                  />
                </button>
              </EuiToolTip>
            </div>
          );
        })}
      </div>
      <EuiSpacer size="xs" />
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <AgentTimestamp value={events[0]?.timestamp} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <AgentTimestamp value={events[events.length - 1]?.timestamp} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.search',
              {
                defaultMessage: 'Search tools or call IDs',
              }
            )}
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.searchLabel',
              {
                defaultMessage: 'Search tool interactions',
              }
            )}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.toolFilter',
              {
                defaultMessage: 'Filter by tool',
              }
            )}
            value={tool}
            onChange={(event) => setTool(event.target.value)}
            options={[
              {
                value: '',
                text: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.allTools',
                  { defaultMessage: 'All tools' }
                ),
              },
              ...tools.map((name) => ({ value: name, text: name })),
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.outcomeFilter',
              {
                defaultMessage: 'Filter tool outcomes',
              }
            )}
            idSelected={outcome}
            onChange={setOutcome}
            options={[
              {
                id: 'all',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.all',
                  { defaultMessage: 'All' }
                ),
              },
              {
                id: 'security',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.securityOnly',
                  { defaultMessage: 'With findings' }
                ),
              },
              {
                id: 'failure',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.failed',
                  { defaultMessage: 'Failed' }
                ),
              },
              {
                id: 'unknown',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.unknown',
                  { defaultMessage: 'Unknown' }
                ),
              },
            ]}
            buttonSize="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {bucket !== undefined && (
        <EuiButtonEmpty size="xs" onClick={() => setBucket(undefined)}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.clearInterval',
            { defaultMessage: 'Clear time selection' }
          )}
        </EuiButtonEmpty>
      )}
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.coverage',
            {
              defaultMessage: '{shown, number} of {loaded, number} interactions · {coverage}',
              values: {
                shown: filtered.length,
                loaded: events.length,
                coverage: complete
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.complete',
                      {
                        defaultMessage: 'Snapshot loaded',
                      }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.partial',
                      {
                        defaultMessage: 'Partial evidence',
                      }
                    ),
              },
            }
          )}
        </p>
      </EuiText>
      <EuiInMemoryTable
        items={filtered}
        columns={columns}
        itemId={(event) => event.source.id}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        sorting={{ sort: { field: 'timestamp', direction: 'asc' } }}
        tableCaption={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.codex.trail.caption',
          {
            defaultMessage: 'Observed agent tool interactions',
          }
        )}
      />
      {selectedFinding && (
        <FindingDetails
          finding={selectedFinding}
          onClose={() => setSelectedFindingKey(undefined)}
        />
      )}
    </IntelligencePanel>
  );
};
