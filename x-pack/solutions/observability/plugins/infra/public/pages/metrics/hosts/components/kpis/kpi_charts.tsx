/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostKpiTiles } from './host_kpi_tiles';

// Hosts page KPI strip — four headline tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage). The values come from a single client-side
// ES|QL `STATS` query issued over the data plugin (see
// `host_kpi_tiles.tsx` / `use_hosts_kpis_esql.ts`) instead of four parallel
// Lens charts — one query variant per schema (semconv OTel indices, ECS
// system indices). The query fires in parallel with the `/host` table
// fetch (both gated on `useHostsPageReady`), so user-perceived KPI
// latency is `max(/host, kpis)` rather than `/host + kpis`.
export const KpiCharts = () => <HostKpiTiles />;
