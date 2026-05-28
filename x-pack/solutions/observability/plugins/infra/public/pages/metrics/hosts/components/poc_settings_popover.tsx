/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PoC-only — gear popover that exposes every individual perf-experiment
// switch grouped by focus area. Hard-coded English copy because this
// surface is not user-facing; remove the whole component before merge.
//
// Organisation: one section per "feature area" of the Hosts page (KPI
// tiles, table, metrics tab, cross-cutting plumbing). Each section opens
// to a list of toggles, one per proposal. Toggles are independent — flip
// any subset to isolate that proposal's cost. The notes inline call out
// which toggles only have an effect when another toggle is also ON
// (dependency-bound flags).

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { usePocSettingsContext } from '../hooks/use_poc_settings';
import { PERF_KEYS, perfTracker, type PerfEntry } from '../utils/perf_tracker';

export const PocSettingsPopover = () => {
  const [open, setOpen] = useState(false);
  const settings = usePocSettingsContext();

  // The button switches to "fill" state whenever *any* flag is in a non-
  // default position, so a reviewer's eye is drawn to the gear icon
  // when the page is in a non-default configuration. `dropKpiTrendline`
  // defaults to `false` (main behaviour) — every other "default" flag
  // here is on by default. Invert the trendline check accordingly.
  const allDefault =
    !settings.dropKpiTrendline &&
    settings.useTermsFilter &&
    settings.useConsolidatedKql &&
    settings.useStrippedBoolWrap;

  return (
    <EuiPopover
      data-test-subj="hostsViewPocSettingsPopover"
      button={
        <EuiButtonIcon
          aria-label="PoC settings"
          iconType="gear"
          color="text"
          display={allDefault ? 'empty' : 'fill'}
          onClick={() => setOpen((prev) => !prev)}
          data-test-subj="hostsViewPocSettingsButton"
        />
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="m"
    >
      <EuiPopoverTitle>PoC perf toggles</EuiPopoverTitle>
      <div style={{ width: 380, maxHeight: 560, overflowY: 'auto' }}>
        <EuiText size="xs" color="subdued">
          One switch per proposal, grouped by the area of the Hosts page they touch. Flip individual
          flags to isolate the cost of a single change (e.g. compare P11 vs no-server-sort, or
          measure P16-A against the inventory-model DSL charts). Persisted in localStorage; resets
          to all-ON on a fresh browser.
        </EuiText>
        <EuiSpacer size="m" />

        <Section title="KPI tiles" defaultOpen>
          <Toggle
            proposal="P15a"
            label="Drop trendline behind KPI headline"
            checked={settings.dropKpiTrendline}
            onChange={settings.setDropKpiTrendline}
            dataTestSubj="hostsViewPocSettingsKpiDropTrendlineSwitch"
            description={
              <>
                ON — drop the small sparkline behind each KPI headline number, so the tile only
                renders the scalar headline (the P15a optimisation). OFF — keep the trendline, which
                is the inventory-model + main behaviour. Independent of the ES|QL toggle below: with
                ES|QL ON, dropping the trendline skips the second bucketed{' '}
                <EuiCode language="esql">STATS … BY BUCKET(...)</EuiCode> query per tile; with ES|QL
                OFF, it suppresses the DSL <EuiCode>date_histogram</EuiCode> sub-aggregation Lens
                adds for the formula trendline path.
              </>
            }
          />
          <Toggle
            proposal="P15c"
            label="Render KPIs via Lens ES|QL viz"
            checked={settings.useLensEsqlKpiCharts}
            onChange={settings.setUseLensEsqlKpiCharts}
            dataTestSubj="hostsViewPocSettingsLensEsqlKpisSwitch"
            description={
              <>
                ON — each KPI tile fires a scalar ES|QL <EuiCode>STATS</EuiCode> for the headline
                number. The trendline (sparkline) is intentionally disabled on this path —{' '}
                <EuiCode>kbn-lens-embeddable-utils</EuiCode> only knows how to bucketize a
                DSL/formula value for the metric viz&apos;s second layer, and the ES|QL equivalent
                didn&apos;t render cleanly during the spike. The trendline toggle above only applies
                when this toggle is OFF. OFF — fall back to the inventory-model formula configs
                which rely on Lens&apos;s DSL formula path (the pre-PoC main behaviour). Per-tile
                wall times are logged to the overlay below as{' '}
                <EuiCode>KPI tiles — Lens ES|QL (per tile)</EuiCode>. Overridden by the server-
                endpoint toggle below.
              </>
            }
          />
          <Toggle
            proposal="P15b"
            label="Render KPIs via server endpoint (plain indicator)"
            checked={settings.useEsqlEndpointKpi}
            onChange={settings.setUseEsqlEndpointKpi}
            dataTestSubj="hostsViewPocSettingsEsqlEndpointKpiSwitch"
            description={
              <>
                ON — bypass Lens for the KPI strip. The page fires{' '}
                <EuiCode>POST /api/metrics/infra/host/kpis</EuiCode> once per render cycle; the
                server runs a single ES|QL <EuiCode>STATS</EuiCode> (semconv) or one DSL search with
                four sibling aggregations (ECS), and returns four scalar values. The tiles render
                through the pre-Lens <EuiCode>MetricChartWrapper</EuiCode> (an Elastic Charts{' '}
                <EuiCode>Metric</EuiCode>) so the per-tile rendering cost reduces to a plain React
                update with no Lens wiring. OFF — fall through to the two Lens toggles above (DSL or
                ES|QL embeddable). Higher precedence than P15c and P15a — flipping this on disables
                both. The single per-fetch wall time is logged to the overlay below as{' '}
                <EuiCode>KPI strip — server endpoint (ES|QL, per fetch)</EuiCode>.
              </>
            }
          />
        </Section>

        <Section title="Metrics tab">
          <Toggle
            proposal="P16-A"
            label="Render Metrics tab via Lens ES|QL viz"
            checked={settings.useLensEsqlMetricsCharts}
            onChange={settings.setUseLensEsqlMetricsCharts}
            dataTestSubj="hostsViewPocSettingsLensEsqlChartsSwitch"
            description={
              <>
                ON — all eleven Metrics-tab tiles render through Lens xy embeddables backed by ES|QL{' '}
                <EuiCode>STATS … BY host.name, BUCKET(...)</EuiCode> queries (one per chart, fired
                by Lens&apos;s own IntersectionObserver). OFF — fall back to the legacy
                inventory-model Lens DSL charts. The chart chrome and per-series legend table (Avg /
                Min / Max / Last non-null) are identical between the two paths; only the data source
                changes. Counter metrics (rx/tx, disk I/O, throughput) display the raw{' '}
                <EuiCode>MAX(field)</EuiCode> because ES|QL <EuiCode>RATE()</EuiCode> requires a{' '}
                <EuiCode>TS</EuiCode> pipeline that doesn&apos;t accept the per-direction filter we
                need. Per-chart wall times are logged to the overlay below as{' '}
                <EuiCode>Metrics tab — Lens ES|QL (per chart)</EuiCode>.
              </>
            }
          />
        </Section>

        <Section title="Cross-cutting plumbing">
          <Toggle
            proposal="P1"
            label="Flat terms filter"
            checked={settings.useTermsFilter}
            onChange={settings.setUseTermsFilter}
            dataTestSubj="hostsViewPocSettingsTermsFilterSwitch"
            description={
              <>
                ON — multi-value host filters use a single <EuiCode>terms</EuiCode> clause. OFF —
                rebuild as <EuiCode>OR</EuiCode>-of-<EuiCode>match_phrase</EuiCode> in{' '}
                <EuiCode>buildCombinedAssetFilter</EuiCode> (pre-P1 shape).
              </>
            }
          />
          <Toggle
            proposal="P2"
            label="Consolidated KQL (alerts deep link)"
            checked={settings.useConsolidatedKql}
            onChange={settings.setUseConsolidatedKql}
            dataTestSubj="hostsViewPocSettingsConsolidatedKqlSwitch"
            description={
              <>
                ON — single-field <EuiCode>host.name: (&quot;a&quot; or &quot;b&quot;)</EuiCode> in
                the Open-in-Alerts deep link. OFF — one OR&apos;d clause per host (pre-P2).
              </>
            }
          />
          <Toggle
            proposal="P5"
            label="Stripped bool wrap"
            checked={settings.useStrippedBoolWrap}
            onChange={settings.setUseStrippedBoolWrap}
            dataTestSubj="hostsViewPocSettingsStrippedBoolWrapSwitch"
            description={
              <>
                ON — drop the redundant outer <EuiCode>bool</EuiCode> wrap in{' '}
                <EuiCode>InfraMetricsClient.search</EuiCode> when no excluded-tier filter applies.
                OFF — keep the wrap (sent server-side via <EuiCode>x-poc-legacy-bool-wrap</EuiCode>
                ).
              </>
            }
          />
        </Section>

        <Section title="Recent endpoint timings" defaultOpen>
          <PerfOverlay />
        </Section>
      </div>
      <EuiPopoverFooter>
        <EuiText size="xs" color="subdued">
          PoC-only. All flags ship ON by default.
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

// Live overlay of the most recent endpoint timings captured by `perfTracker`.
// Subscribes through `useSyncExternalStore` so the rest of the tree never
// re-renders when a new sample lands — only this component does. Each row
// is one tracked endpoint; we display the latest sample large, plus a small
// summary (count / min / avg / max) so reviewers can eyeball variance
// without copy-pasting numbers into a spreadsheet.
const PerfOverlay: React.FC = () => {
  const snapshot = useSyncExternalStore(
    useCallback((cb) => perfTracker.subscribe(cb), []),
    () => perfTracker.getSnapshot(),
    () => perfTracker.getSnapshot()
  );

  const rows = Object.values(PERF_KEYS).map((key) => ({
    key,
    entries: snapshot.get(key) ?? [],
  }));
  const hasAny = rows.some((row) => row.entries.length > 0);

  return (
    <>
      <EuiText size="xs" color="subdued">
        Wall-time of each Hosts UI endpoint as measured client-side (network + server). Updates
        live; latest sample shown large, summary across the last {`≤10`} samples on the right.
        Numbers also logged to the dev console with the <EuiCode>[hosts-perf]</EuiCode> prefix.
      </EuiText>
      <EuiSpacer size="s" />
      {hasAny ? (
        <>
          {rows.map((row) =>
            row.entries.length === 0 ? null : (
              <PerfRow key={row.key} label={row.key} entries={row.entries} />
            )
          )}
          <EuiSpacer size="xs" />
          <EuiButtonEmpty
            size="xs"
            iconType="cross"
            onClick={() => perfTracker.clear()}
            data-test-subj="hostsViewPocSettingsClearTimings"
          >
            Clear timings
          </EuiButtonEmpty>
        </>
      ) : (
        <EuiText size="xs" color="subdued">
          No samples yet. Reload the page or change a toggle to trigger a fetch.
        </EuiText>
      )}
    </>
  );
};

const PerfRow: React.FC<{ label: string; entries: ReadonlyArray<PerfEntry> }> = ({
  label,
  entries,
}) => {
  const latest = entries[0];
  // Summary stats are intentionally derived from `entries` (capped at the
  // tracker's ring-buffer size) so trends inside a single session are
  // legible without ever growing unbounded.
  const durations = entries.map((e) => e.duration);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

  return (
    <EuiPanel hasBorder paddingSize="s" style={{ marginBottom: 6 }}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow>
          <EuiText size="xs">
            <strong>{label}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {formatMeta(latest.meta)} · n={entries.length} · min/avg/max {formatMs(min)}/
            {formatMs(avg)}/{formatMs(max)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m" textAlign="right">
            <strong>{formatMs(latest.duration)}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${value.toFixed(0)}ms`;
}

function formatMeta(meta: PerfEntry['meta']): string {
  if (!meta) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(meta)) {
    parts.push(`${k}=${v}`);
  }
  return parts.join(' · ');
}

// Small wrapper around `EuiAccordion` to standardise section spacing. Each
// section opens / closes independently; `defaultOpen` lets us pre-expand the
// first one so the popover doesn't look empty on first open.
const Section: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen, children }) => (
  <>
    <EuiAccordion
      id={`pocSection-${title}`}
      initialIsOpen={defaultOpen}
      buttonContent={
        <EuiTitle size="xxs">
          <h4>{title}</h4>
        </EuiTitle>
      }
      paddingSize="s"
    >
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        {children}
      </EuiPanel>
    </EuiAccordion>
    <EuiSpacer size="xs" />
  </>
);

// Standardised per-toggle layout. The proposal ID is rendered as a prefix
// pill so a reviewer can map each switch back to PROPOSALS.md without
// hunting through the description.
const Toggle: React.FC<{
  proposal: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description: React.ReactNode;
  dependsOn?: string;
  dataTestSubj: string;
}> = ({ proposal, label, checked, onChange, description, dependsOn, dataTestSubj }) => (
  <>
    <EuiSwitch
      compressed
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      label={`${proposal} — ${label}`}
      data-test-subj={dataTestSubj}
    />
    <EuiText size="xs" color="subdued" style={{ marginLeft: 32 }}>
      {description}
    </EuiText>
    {dependsOn ? (
      <EuiText size="xs" color="warning" style={{ marginLeft: 32, marginTop: 2 }}>
        {dependsOn}
      </EuiText>
    ) : null}
    <EuiSpacer size="s" />
  </>
);
