/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiLoadingSpinner,
  EuiIcon,
  EuiBadge,
} from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';

interface EndpointEvent {
  '@timestamp'?: string;
  'event.category'?: string[];
  'event.action'?: string;
  'process.name'?: string;
  'process.command_line'?: string;
  'source.ip'?: string;
  'destination.ip'?: string;
  'destination.port'?: number;
  'network.transport'?: string;
  'file.path'?: string;
  'registry.key'?: string;
}

interface EndpointEventsResponse {
  events: EndpointEvent[];
  total: number;
  hostname: string;
  error?: string;
}

interface ForensicEvidenceProps {
  investigationId: string;
}

export const ForensicEvidence: React.FC<ForensicEvidenceProps> = ({ investigationId }) => {
  const { services } = useKibana<{ http: HttpStart }>();
  const http = services.http;
  const { euiTheme } = useEuiTheme();
  const [events, setEvents] = useState<EndpointEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostname, setHostname] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const result = await http!.get<EndpointEventsResponse>(
          `/internal/pnd/investigations/${investigationId}/endpoint-events`
        );
        if (mounted) {
          setEvents(result.events ?? []);
          setHostname(result.hostname ?? '');
          setHasError(!!result.error);
        }
      } catch {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [http, investigationId]);

  if (loading) {
    return (
      <EuiPanel hasBorder>
        <EuiLoadingSpinner size="m" /> <EuiText size="s">Loading endpoint telemetry…</EuiText>
      </EuiPanel>
    );
  }

  if (hasError || events.length === 0) {
    return (
      <EuiPanel hasBorder color="subdued">
        <EuiTitle size="xxs">
          <h4>
            <EuiIcon type="visVisualBuilderWidget" /> Forensic Evidence (Endpoint Telemetry)
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {hasError
            ? 'Endpoint telemetry not available for this host. Ensure Elastic Defend is enrolled.'
            : 'No endpoint events found for this host.'}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder>
      <EuiTitle size="xxs">
        <h4>
          <EuiIcon type="visVisualBuilderWidget" /> Forensic Evidence — {hostname} ({events.length}{' '}
          events)
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell>Time</EuiTableHeaderCell>
          <EuiTableHeaderCell>Category</EuiTableHeaderCell>
          <EuiTableHeaderCell>Process</EuiTableHeaderCell>
          <EuiTableHeaderCell>Details</EuiTableHeaderCell>
          <EuiTableHeaderCell>Network</EuiTableHeaderCell>
        </EuiTableHeader>
        <EuiTableBody>
          {events.slice(0, 20).map((evt, i) => {
            const ts = evt['@timestamp'] ?? '';
            const cat = (evt['event.category'] ?? []).join(', ');
            const proc = evt['process.name'] ?? evt['file.path'] ?? evt['registry.key'] ?? '';
            const cmd = evt['process.command_line'] ?? '';
            const dst = evt['destination.ip']
              ? `${evt['destination.ip']}:${evt['destination.port'] ?? ''}`
              : '';
            return (
              <EuiTableRow key={i}>
                <EuiTableRowCell>
                  <EuiText size="xs" style={{ fontFamily: 'monospace' }}>
                    {ts.substring(11, 19)}
                  </EuiText>
                </EuiTableRowCell>
                <EuiTableRowCell>
                  <EuiBadge
                    color={
                      cat === 'process'
                        ? euiTheme.colors.accentSecondary
                        : cat === 'network'
                        ? euiTheme.colors.warning
                        : euiTheme.colors.subduedText
                    }
                  >
                    {cat || '—'}
                  </EuiBadge>
                </EuiTableRowCell>
                <EuiTableRowCell>
                  <EuiText size="xs" style={{ fontFamily: 'monospace' }}>
                    {proc || '—'}
                  </EuiText>
                </EuiTableRowCell>
                <EuiTableRowCell>
                  <EuiText
                    size="xs"
                    style={{
                      fontFamily: 'monospace',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cmd || '—'}
                  </EuiText>
                </EuiTableRowCell>
                <EuiTableRowCell>
                  <EuiText size="xs" style={{ fontFamily: 'monospace' }}>
                    {dst || '—'}
                  </EuiText>
                </EuiTableRowCell>
              </EuiTableRow>
            );
          })}
        </EuiTableBody>
      </EuiTable>
    </EuiPanel>
  );
};
