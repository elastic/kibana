/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, transparentize, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { activityLabel, outcomeLabel } from './security_findings/security_findings_panel';
import { buildSecuritySequences } from './security_findings/security_sequences';
import type { SecuritySequence } from './security_findings/security_sequences';
import type { SecurityFinding } from './security_findings/types';
import type { TimeRangePreset } from './graph_state';
import type { AlertSeverity } from './hooks/use_entity_relationships';

export const SECURITY_EVENT_WIDTH = 180;
export const SECURITY_EVENT_HEIGHT = 108;
export const SECURITY_EVENT_LIMIT = 4;
const EVENT_GAP = 18;

export interface SecurityEventPosition {
  finding: SecurityFinding;
  x: number;
  y: number;
}

const TIME_RANGE_MILLISECONDS: Readonly<Record<TimeRangePreset, number>> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

/** Applies the graph's inclusive relative time window and selected severities to observed findings. */
export const filterSecurityFindingsForGraph = (
  findings: readonly SecurityFinding[],
  timeRange: TimeRangePreset,
  severities: readonly AlertSeverity[],
  now = Date.now()
): SecurityFinding[] => {
  const from = now - TIME_RANGE_MILLISECONDS[timeRange];
  return findings.filter((finding) => {
    const observedAt = Date.parse(finding.timestamp);
    return observedAt >= from && observedAt <= now && severities.includes(finding.severity);
  });
};

/** Requires an exact canonical entity link before attaching structured events to its graph node. */
export const entitySecuritySequences = (
  findings: readonly SecurityFinding[],
  entityId: string
): SecuritySequence[] =>
  buildSecuritySequences(
    findings.filter(
      (finding) => finding.entityIds.includes(entityId) && (finding.scenario || finding.policy)
    )
  );

/** Shows a bounded event lane in the same world coordinates as the relationship graph. */
export const layoutSecurityEvents = (
  findings: readonly SecurityFinding[],
  centerX: number,
  top: number,
  columns = 4
): SecurityEventPosition[] => {
  const visible = findings.slice(0, SECURITY_EVENT_LIMIT);
  const count = Math.min(visible.length, columns);
  const width = count * SECURITY_EVENT_WIDTH + Math.max(0, count - 1) * EVENT_GAP;
  return visible.map((finding, index) => ({
    finding,
    x: centerX - width / 2 + (index % columns) * (SECURITY_EVENT_WIDTH + EVENT_GAP),
    y: top + Math.floor(index / columns) * (SECURITY_EVENT_HEIGHT + EVENT_GAP),
  }));
};

/** A recorded order requires distinct explicit steps that agree with event timestamps. */
export const hasRecordedSecurityOrder = (sequence: SecuritySequence | undefined): boolean =>
  !!sequence &&
  sequence.basis === 'scenario' &&
  sequence.findings.length > 1 &&
  sequence.findings.every((finding, index) => {
    const step = finding.scenario?.step;
    const previous = sequence.findings[index - 1]?.scenario?.step;
    return (
      step !== undefined &&
      Number.isSafeInteger(step) &&
      step > 0 &&
      (index === 0 || (previous !== undefined && step > previous))
    );
  });

const clip = (value: string, maximum: number): string =>
  value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;

/** Renders evidence nodes inside the graph's existing SVG transform without implying tool causality. */
export const RelationshipSecurityNodes: React.FC<{
  nodes: readonly SecurityEventPosition[];
  root: { x: number; y: number };
  recordedOrder: boolean;
  onSelect: (finding: SecurityFinding) => void;
}> = ({ nodes, root, recordedOrder, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  if (!nodes.length) return null;
  const laneY = nodes[0].y - 24;
  return (
    <g data-test-subj="entityGraphSecurityEvents">
      {recordedOrder ? (
        <g pointerEvents="none" data-test-subj="entityGraphRecordedSecurityOrder">
          <path
            d={`M ${root.x} ${root.y + 42} V ${laneY} H ${
              nodes[0].x + SECURITY_EVENT_WIDTH / 2
            } V ${nodes[0].y}`}
            fill="none"
            stroke={euiTheme.colors.primary}
            strokeDasharray="4 5"
          />
          {nodes.slice(1).map((node, index) => {
            const previous = nodes[index];
            const fromX = previous.x + SECURITY_EVENT_WIDTH;
            const fromY = previous.y + SECURITY_EVENT_HEIGHT / 2;
            return (
              <path
                key={JSON.stringify([node.finding.source.index, node.finding.source.id])}
                d={
                  previous.y === node.y
                    ? `M ${fromX} ${fromY} H ${node.x}`
                    : `M ${fromX} ${fromY} h 10 V ${node.y - 9} H ${
                        node.x + SECURITY_EVENT_WIDTH / 2
                      } V ${node.y}`
                }
                fill="none"
                stroke={euiTheme.colors.primary}
                strokeDasharray="3 4"
              >
                <title>{new Date(node.finding.timestamp).toLocaleString()}</title>
              </path>
            );
          })}
          <text x={nodes[0].x} y={laneY - 12} fontSize={11} fill={euiTheme.colors.textSubdued}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.recordedEventOrder',
              {
                defaultMessage: 'Recorded order',
              }
            )}
          </text>
          <title>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.recordedEventOrderHint',
              {
                defaultMessage:
                  'Events share an explicit scenario and recorded step order. This connection does not establish causation.',
              }
            )}
          </title>
        </g>
      ) : null}
      {nodes.map(({ finding, x, y }) => {
        const color =
          finding.outcome === 'blocked'
            ? euiTheme.colors.primary
            : finding.kind === 'policy_violation'
            ? euiTheme.colors.danger
            : euiTheme.colors.warning;
        const action = finding.action ? activityLabel(finding.action) : finding.title;
        const outcome =
          finding.kind === 'policy_violation'
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.allowedDespitePolicy',
                {
                  defaultMessage: 'Allowed despite policy',
                }
              )
            : outcomeLabel(finding);
        const label = i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.graph.inspectSecurityEvent',
          {
            defaultMessage: 'Inspect {action}: {outcome}',
            values: { action, outcome },
          }
        );
        const icon =
          finding.outcome === 'blocked'
            ? 'shield'
            : finding.kind === 'policy_violation'
            ? 'warning'
            : 'bolt';
        return (
          <g
            key={JSON.stringify([finding.source.index, finding.source.id])}
            data-test-subj="entityGraphSecurityEvent"
            data-outcome={finding.outcome}
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={() => onSelect(finding)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(finding);
              }
            }}
          >
            <title>{`${action} · ${outcome}\n${finding.target ?? finding.title}\n${
              finding.timestamp
            }`}</title>
            {!recordedOrder ? (
              <path
                d={`M ${root.x} ${root.y + 42} L ${x + SECURITY_EVENT_WIDTH / 2} ${y}`}
                fill="none"
                stroke={transparentize(color, 0.65)}
                strokeDasharray="4 5"
                pointerEvents="none"
              />
            ) : null}
            <rect
              x={x}
              y={y}
              width={SECURITY_EVENT_WIDTH}
              height={SECURITY_EVENT_HEIGHT}
              rx={8}
              fill={euiTheme.colors.backgroundBasePlain}
              stroke={color}
              strokeWidth={1.5}
            />
            <rect x={x} y={y + 8} width={4} height={SECURITY_EVENT_HEIGHT - 16} fill={color} />
            <text x={x + 12} y={y + 20} fontSize={10} fill={euiTheme.colors.textSubdued}>
              {recordedOrder && finding.scenario ? `${finding.scenario.step} · ` : ''}
              {new Date(finding.timestamp).toLocaleTimeString()}
            </text>
            <EuiIcon
              type={icon}
              x={x + 12}
              y={y + 31}
              width={16}
              height={16}
              color={color}
              aria-hidden={true}
            />
            <text
              x={x + 35}
              y={y + 44}
              fontSize={14}
              fontWeight={600}
              fill={euiTheme.colors.textParagraph}
            >
              {clip(action, 17)}
            </text>
            <text x={x + 12} y={y + 67} fontSize={11} fill={euiTheme.colors.textSubdued}>
              {clip(finding.target ?? finding.title, 26)}
            </text>
            <text x={x + 12} y={y + 91} fontSize={11} fontWeight={600} fill={color}>
              {outcome}
            </text>
          </g>
        );
      })}
    </g>
  );
};
