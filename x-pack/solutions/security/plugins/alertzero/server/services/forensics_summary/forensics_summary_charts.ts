/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import { getIocKindClass } from './constants';

// The card's inline SVG charts, as coordinates the template only has to print. Mustache has no
// arithmetic, so every position is worked out here. Sizes are in each chart's own viewBox units.

const round = (value: number): number => Math.round(value * 10) / 10;

/** Text cut to a length with an ellipsis, so a long value can't overflow its chart. */
export const truncateText = (text: string, length: number): string =>
  truncate(text, { length, omission: '…' });

export interface ChartPart {
  className: string;
  count: number;
}

/** A donut of radius 20 in a 52 × 52 box, its circumference to two decimals. */
const DONUT_CIRCUMFERENCE = 125.66;

/** One arc per part with a count, laid end to end from 12 o'clock. */
export const buildDonutSegments = (
  parts: readonly ChartPart[]
): Array<{ className: string; dashArray: string; dashOffset: string }> => {
  const total = parts.reduce((sum, { count }) => sum + count, 0);
  if (total === 0) {
    return [];
  }
  let offset = 0;
  return parts
    .filter(({ count }) => count > 0)
    .map(({ className, count }) => {
      const length = (count * DONUT_CIRCUMFERENCE) / total;
      const segment = {
        className,
        dashArray: `${length.toFixed(2)} ${DONUT_CIRCUMFERENCE}`,
        dashOffset: (-offset).toFixed(2),
      };
      offset += length;
      return segment;
    });
};

/** Each part with a count as its share of a stacked bar, in percent. */
export const buildSplit = (
  parts: readonly ChartPart[]
): Array<{ className: string; width: number }> => {
  const total = parts.reduce((sum, { count }) => sum + count, 0);
  return total === 0
    ? []
    : parts
        .filter(({ count }) => count > 0)
        .map(({ className, count }) => ({ className, width: round((count * 100) / total) }));
};

const CHEVRON_WIDTH = 52;
const CHEVRON_TIP = 6;
const CHEVRON_HEIGHT = 30;

/** The kill chain as chevrons in a 734 × 30 box, each but the first notched into the one before it. */
export const buildChevrons = (
  tactics: ReadonlyArray<{ name: string; short: string; detected: boolean }>
): Array<{ name: string; short: string; on: boolean; points: string; labelX: number }> =>
  tactics.map(({ name, short, detected }, index) => {
    const x = index * CHEVRON_WIDTH;
    const right = x + CHEVRON_WIDTH - CHEVRON_TIP;
    const middle = CHEVRON_HEIGHT / 2;
    const points = [
      `${x},0`,
      `${right},0`,
      `${x + CHEVRON_WIDTH},${middle}`,
      `${right},${CHEVRON_HEIGHT}`,
      `${x},${CHEVRON_HEIGHT}`,
      ...(index > 0 ? [`${x + CHEVRON_TIP},${middle}`] : []),
    ].join(' ');
    return { name, short, on: detected, points, labelX: x + (CHEVRON_WIDTH + CHEVRON_TIP) / 2 };
  });

/** The time axis spans x 64 to 724 of a 736 × 56 box; the lane labels sit left of it. */
const AXIS_START = 64;
const AXIS_WIDTH = 660;
/** A gap label needs this much room between two markers. */
const MIN_GAP_LABEL_WIDTH = 40;
const MIN_SPAN_SECONDS = 60;

/** A gap between two times, in the largest whole unit that fits. */
export const formatGap = (seconds: number): string => {
  if (seconds < 60) {
    return `+${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    return `+${Math.round(seconds / 60)}m`;
  }
  return `+${Math.round(seconds / 3600)}h`;
};

/**
 * An ISO timestamp's time of day, labeled UTC. The card is rendered on the server and can't know the viewer's
 * zone, so every time it shows is UTC and says so. Unparseable text is kept.
 */
export const formatTimeOfDay = (timestamp: string): string => {
  const time = Date.parse(timestamp);
  return Number.isNaN(time) ? timestamp : `${new Date(time).toISOString().slice(11, 19)} UTC`;
};

export interface TimelinePlot {
  events: Array<{ x: number; number: number; title: string }>;
  gaps: Array<{ x: number; label: string }>;
  alerts: Array<{ x: number; severity: string; title: string }>;
  start: string;
  end: string;
  spanMinutes: number;
}

/**
 * The events, numbered as in the list under the chart, on a time axis padded by a tenth of their span,
 * with the gaps between them and the alerts that fall inside it. Undefined when no event time parses.
 */
export const buildTimelinePlot = (
  events: ReadonlyArray<{ timestamp: string; description: string }>,
  alerts: ReadonlyArray<{ timestamp?: string; severity: string; ruleName: string }>
): TimelinePlot | undefined => {
  const timed = events.flatMap(({ timestamp, description }, index) => {
    const seconds = Date.parse(timestamp) / 1000;
    return Number.isNaN(seconds) ? [] : [{ seconds, timestamp, description, number: index + 1 }];
  });
  if (timed.length === 0) {
    return undefined;
  }
  const times = timed.map(({ seconds }) => seconds);
  const first = Math.min(...times);
  const last = Math.max(...times);
  const span = Math.max(last - first, MIN_SPAN_SECONDS);
  const padding = span / 10;
  const low = first - padding;
  const high = first + span + padding;
  const toX = (seconds: number): number =>
    round(AXIS_START + ((seconds - low) * AXIS_WIDTH) / (high - low));

  const plotted = timed.map((event) => ({ ...event, x: toX(event.seconds) }));
  const gaps = plotted.flatMap((event, index) => {
    const previous = plotted[index - 1];
    return previous && event.x - previous.x > MIN_GAP_LABEL_WIDTH
      ? [
          {
            x: round((event.x + previous.x) / 2),
            label: formatGap(event.seconds - previous.seconds),
          },
        ]
      : [];
  });

  return {
    events: plotted.map(({ x, number, timestamp, description }) => ({
      x,
      number,
      title: `${formatTimeOfDay(timestamp)} ${truncateText(description, 160)}`,
    })),
    gaps,
    alerts: alerts.flatMap(({ timestamp, severity, ruleName }) => {
      const seconds = timestamp ? Date.parse(timestamp) / 1000 : NaN;
      return Number.isNaN(seconds) || seconds < low || seconds > high
        ? []
        : [{ x: toX(seconds), severity, title: ruleName }];
    }),
    start: formatTimeOfDay(timed.find(({ seconds }) => seconds === first)?.timestamp ?? ''),
    end: formatTimeOfDay(timed.find(({ seconds }) => seconds === last)?.timestamp ?? ''),
    spanMinutes: Math.round((last - first) / 60),
  };
};

export interface GraphNode {
  value: string;
  label: string;
  kind: string;
  className: string;
  edgeLabel: string;
  y: number;
  edgeLabelY: number;
}

/** The host box sits at the middle of a 340 × 170 box; nodes stack around its center line. */
const GRAPH_CENTER_Y = 85;
const GRAPH_ROW = 50;
const MAX_LEFT_NODES = 2;
const MAX_RIGHT_NODES = 3;
const MAX_IPS = 2;

const stack = <T extends Omit<GraphNode, 'y' | 'edgeLabelY'>>(nodes: readonly T[]): GraphNode[] => {
  const top = GRAPH_CENTER_Y - ((nodes.length - 1) * GRAPH_ROW) / 2;
  return nodes.map((node, index) => {
    const y = top + index * GRAPH_ROW;
    return { ...node, y, edgeLabelY: (y + GRAPH_CENTER_Y) / 2 - 4 };
  });
};

/**
 * The host with the identities that ran on it to its left, and the network destinations and other
 * hosts it reached to its right. Class names pick each kind's `--cc-vis-*` color.
 */
export const buildEntityGraph = ({
  host,
  identities,
  ips,
  hosts,
}: {
  host?: string;
  identities: readonly string[];
  ips: readonly string[];
  hosts: readonly string[];
}): { host: string; left: GraphNode[]; right: GraphNode[]; empty: boolean } => {
  const left = stack(
    identities.slice(0, MAX_LEFT_NODES).map((value) => ({
      value,
      label: truncateText(value, 14),
      kind: 'USER',
      className: getIocKindClass('compromised_identities'),
      edgeLabel: 'ran as',
    }))
  );
  const right = stack(
    [
      ...ips.slice(0, MAX_IPS).map((value) => ({
        value,
        label: truncateText(value, 16),
        kind: 'IP',
        className: getIocKindClass('ips'),
        edgeLabel: 'connected',
      })),
      ...hosts
        .filter((value) => value !== host)
        .map((value) => ({
          value,
          label: truncateText(value.split('.')[0], 16),
          kind: 'HOST',
          className: getIocKindClass('affected_hosts'),
          edgeLabel: 'reached',
        })),
    ].slice(0, MAX_RIGHT_NODES)
  );
  return {
    host: host ? truncateText(host, 18) : 'host unknown',
    left,
    right,
    empty: left.length === 0 && right.length === 0,
  };
};
