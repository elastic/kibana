/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostKpiTiles } from './host_kpi_tiles';

// Hosts page KPI strip — four headline tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage). The values come from a single server-side
// summary request (`POST /api/metrics/infra/host/kpis`, see
// `host_kpi_tiles.tsx` / `use_hosts_kpis.ts`) instead of four parallel
// Lens charts: one ES|QL `STATS` round-trip on semconv data, one DSL
// search on ECS. The request fires in parallel with the `/host` table
// fetch (both gated on `useHostsPageReady`), so user-perceived KPI
// latency is `max(/host, /kpis)` rather than `/host + /kpis`.
export const KpiCharts = () => <HostKpiTiles />;
