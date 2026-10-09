/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useEvidence } from './evidence_context';
import { buildEvidenceGraph, type EvidenceFocus } from './evidence_model';
import { evidenceLabels as labels } from './translations';

const icons = ['database', 'apps', 'documents', 'visLine', 'visBarVertical', 'bell'] as const;
const stages = [
  labels.source,
  labels.service,
  labels.knowledge,
  labels.rule,
  labels.detection,
  labels.event,
];

export const EvidenceChain = ({
  focus,
  events,
}: {
  focus: EvidenceFocus;
  events?: SignificantEventResponse[];
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const arrowId = useGeneratedHtmlId({ prefix: 'evidenceArrow' });
  const { data, href, onNavigate, loading, error, retry } = useEvidence();
  const graph = useMemo(
    () =>
      buildEvidenceGraph(
        focus,
        events
          ? {
              ...data,
              events: [
                ...new Map(
                  [...data.events, ...events].map((event) => [event.event_id, event])
                ).values(),
              ],
            }
          : data
      ),
    [focus, data, events]
  );
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const preferred = new Map<number, string>();
  const seed = graph.nodes.find((node) => node.selected) ?? graph.nodes[0];
  const queue = seed ? [seed.id] : [];
  const visited = new Set<string>();
  while (queue.length) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (node && !preferred.has(node.stage)) preferred.set(node.stage, node.id);
    graph.edges
      .filter((edge) => !edge.context && (edge.source === nodeId || edge.target === nodeId))
      .forEach((edge) => queue.push(edge.source === nodeId ? edge.target : edge.source));
  }
  const preferredIds = new Set(preferred.values());
  const contextualService = graph.nodes.find(
    (node) =>
      node.stage === 1 &&
      graph.edges.some(
        (edge) =>
          (edge.source === node.id && preferredIds.has(edge.target)) ||
          (edge.target === node.id && preferredIds.has(edge.source))
      )
  );
  if (contextualService) preferred.set(1, contextualService.id);
  const cardWidth = Math.max(100, width - 86);
  let y = 10;
  const groups = stages
    .map((stage, index) => {
      const all = graph.nodes.filter((n) => n.stage === index);
      const visible = expanded
        ? all
        : all.filter((node) => node.id === (preferred.get(index) ?? all[0]?.id));
      const start = y;
      const nodes = visible.map((node) => {
        const item = { node, x: 64, y };
        y += 66;
        return item;
      });
      if (all.length) y += 34;
      return { stage, index, start, nodes, hidden: all.length - visible.length };
    })
    .filter((group) => group.nodes.length);
  const positions = new Map(groups.flatMap((g) => g.nodes).map((p) => [p.node.id, p]));
  return (
    <section data-test-subj="detectionEvidenceChain">
      <EuiTitle size="xs">
        <h3>{labels.title}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{labels.hint}</p>
      </EuiText>
      {loading && <EuiLoadingSpinner size="s" />}
      {error && (
        <EuiText size="xs" color="subdued">
          <p>
            {labels.error}{' '}
            <EuiButtonEmpty
              size="xs"
              onClick={() => void retry()}
              data-test-subj="evidenceChainRetry"
            >
              {labels.retry}
            </EuiButtonEmpty>
          </p>
        </EuiText>
      )}
      <div
        ref={container}
        css={css`
          position: relative;
          margin-top: ${euiTheme.size.s};
          height: ${y}px;
        `}
      >
        <svg
          width="100%"
          height={y}
          aria-hidden={true}
          css={css`
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
          `}
        >
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill={euiTheme.colors.primary} />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const a = source.y + 28;
            const b = target.y + 28;
            const x = edge.context ? 38 : 20;
            return (
              <path
                key={`${edge.source}:${edge.target}`}
                d={`M 64 ${a} C ${x} ${a}, ${x} ${b}, 64 ${b}`}
                fill="none"
                stroke={edge.context ? euiTheme.colors.mediumShade : euiTheme.colors.primary}
                opacity={edge.context ? 0.35 : 0.5}
                strokeWidth={edge.context ? 1 : 1.5}
                strokeDasharray={edge.context ? '3 4' : undefined}
                markerEnd={edge.context ? undefined : `url(#${arrowId})`}
              />
            );
          })}
        </svg>
        {groups.map((group) => (
          <React.Fragment key={group.index}>
            <span
              css={css`
                position: absolute;
                top: ${group.start - 9}px;
                left: 64px;
                z-index: 1;
                background: ${euiTheme.colors.backgroundBasePlain};
                padding-right: ${euiTheme.size.s};
                color: ${euiTheme.colors.textSubdued};
                font-size: ${euiTheme.font.scale.xs}rem;
              `}
            >
              {group.stage}{' '}
              {group.hidden > 0 && (
                <EuiLink
                  data-test-subj="significantEventsAppEvidenceChainLink"
                  onClick={() => setExpanded(true)}
                >
                  {labels.more(group.hidden)}
                </EuiLink>
              )}
            </span>
            {group.nodes.map(({ node, x, y: top }) => (
              <EuiToolTip
                key={node.id}
                content={
                  node.unavailable
                    ? labels.unavailable
                    : `${node.title}${node.detail ? ' · ' + node.detail : ''}${
                        node.referenceRuns?.length ? ' · ' + labels.latestVersion : ''
                      }`
                }
                position="left"
              >
                <EuiLink
                  href={node.unavailable ? undefined : href(node.target)}
                  onClick={
                    onNavigate && !node.unavailable
                      ? (event) => {
                          if (
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            event.button === 0
                          ) {
                            event.preventDefault();
                            onNavigate(node.target);
                          }
                        }
                      : undefined
                  }
                  aria-current={node.selected ? 'true' : undefined}
                  data-test-subj={`evidenceChain-${node.target.kind}`}
                  css={css`
                    position: absolute;
                    left: ${x}px;
                    top: ${top}px;
                    width: ${cardWidth}px;
                    height: 56px;
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                    padding: ${euiTheme.size.s} ${euiTheme.size.m};
                    border: 1px ${node.unavailable ? 'dashed' : 'solid'}
                      ${node.selected ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
                    border-radius: ${euiTheme.border.radius.medium};
                    background: ${node.selected
                      ? `color-mix(in srgb, ${euiTheme.colors.primary} 9%, ${euiTheme.colors.backgroundBasePlain})`
                      : euiTheme.colors.backgroundBasePlain};
                    color: ${node.unavailable ? euiTheme.colors.textSubdued : euiTheme.colors.text};
                    text-align: left;
                    &:hover {
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                      text-decoration: none;
                      border-color: ${euiTheme.colors.primary};
                    }
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                      outline-offset: 2px;
                    }
                  `}
                >
                  <EuiIcon
                    type={icons[group.index]}
                    color={node.selected ? 'primary' : 'subdued'}
                    aria-hidden={true}
                  />
                  <span
                    css={css`
                      min-width: 0;
                      flex: 1;
                    `}
                  >
                    <span
                      css={css`
                        display: block;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-size: ${euiTheme.font.scale.xs}rem;
                        font-weight: ${euiTheme.font.weight.semiBold};
                      `}
                    >
                      {node.title}
                    </span>
                    {node.detail && (
                      <span
                        css={css`
                          display: block;
                          font-size: ${euiTheme.font.scale.xs}rem;
                          color: ${euiTheme.colors.textSubdued};
                        `}
                      >
                        {node.detail}
                      </span>
                    )}
                  </span>
                  {!node.unavailable && (
                    <EuiIcon type="sortRight" size="s" color="primary" aria-hidden={true} />
                  )}
                </EuiLink>
              </EuiToolTip>
            ))}
          </React.Fragment>
        ))}
      </div>
      {graph.nodes.some(
        (n) => graph.nodes.filter((other) => other.stage === n.stage).length > 1
      ) && (
        <EuiButtonEmpty
          size="xs"
          iconType={expanded ? 'arrowUp' : 'arrowDown'}
          flush="left"
          onClick={() => setExpanded(!expanded)}
          data-test-subj="evidenceChainExpand"
        >
          {expanded ? labels.fewer : labels.all}
        </EuiButtonEmpty>
      )}
    </section>
  );
};
