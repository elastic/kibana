/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enableSynthtraceCapture } from '@kbn/observability-plugin/common';
import { SynthtraceCaptureFab } from '@kbn/observability-shared-plugin/public';
import { decode } from '@kbn/rison';
import React from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

interface SynthtraceCaptureResult {
  scenario: string;
  filename: string;
}

/** Best-effort extraction of the KQL filter from the various infra view URL encodings. */
const readKueryFromSearch = (search: string): string => {
  const params = new URLSearchParams(search);

  // Hosts view stores unified-search state (incl. the KQL bar) under `_a`.
  const hostsState = params.get('_a');
  if (hostsState) {
    try {
      const decoded = decode(hostsState) as { query?: { query?: unknown } } | undefined;
      const query = decoded?.query?.query;
      if (typeof query === 'string' && query.length > 0) return query;
    } catch {
      // ignore malformed url state
    }
  }

  // Inventory view stores its KQL filter under `waffleFilter` as `{ kind, expression }`.
  const waffleFilter = params.get('waffleFilter');
  if (waffleFilter) {
    try {
      const decoded = decode(waffleFilter) as { expression?: unknown } | undefined;
      const expression = decoded?.expression;
      if (typeof expression === 'string' && expression.length > 0) return expression;
    } catch {
      // ignore malformed url state
    }
  }

  return '';
};

/**
 * Developer tool, gated behind the off-by-default `observability:enableSynthtraceCapture`
 * advanced setting. Renders the shared floating button (bottom-right, on every Metrics page) that
 * captures the host/system metrics behind the current page - within the current time range and
 * filters - and downloads it as a runnable `@kbn/synthtrace` scenario `.ts` file.
 */
export function CaptureSynthtraceFab() {
  const {
    services: { http, uiSettings, notifications, data },
  } = useKibanaContextForPlugin();
  const { search } = useLocation();
  // Host detail pages (`/detail/host/:node`) scope the capture to a single host.
  const hostDetailMatch = useRouteMatch<{ type: string; node: string }>('/detail/:type/:node');
  const hostName =
    hostDetailMatch?.params.type === 'host' ? hostDetailMatch.params.node : undefined;

  const isEnabled = uiSettings?.get<boolean>(enableSynthtraceCapture, false) ?? false;

  const { from, to } = data.query.timefilter.timefilter.getAbsoluteTime();
  const start = Date.parse(from);
  const end = Date.parse(to);
  const hasTimeRange = Number.isFinite(start) && Number.isFinite(end);

  return (
    <SynthtraceCaptureFab
      isVisible={isEnabled && hasTimeRange}
      toasts={notifications.toasts}
      dataTestSubj="infraCaptureSynthtraceScenarioFab"
      onCapture={(signal) =>
        http.get<SynthtraceCaptureResult>('/api/infra/synthtrace_scenario', {
          signal,
          query: {
            start,
            end,
            kuery: readKueryFromSearch(search),
            ...(hostName ? { hostName } : {}),
          },
        })
      }
    />
  );
}
