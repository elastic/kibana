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

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCode,
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

export const PocSettingsPopover = () => {
  const [open, setOpen] = useState(false);
  const settings = usePocSettingsContext();

  // The button switches to "fill" state whenever *any* flag is off, so a
  // reviewer's eye is drawn to the gear icon when the page is in a
  // non-default configuration. Cheap visual cue.
  const allOn =
    settings.useKpiEndpoint &&
    settings.dropKpiTrendline &&
    settings.useTwoPhaseFetch &&
    settings.useServerSideSort &&
    settings.useScopedAlerts &&
    settings.useEsqlPhaseB &&
    settings.useMetricsTimeseriesEndpoint &&
    settings.useTermsFilter &&
    settings.useConsolidatedKql &&
    settings.useStrippedBoolWrap &&
    settings.useReadyGate;

  return (
    <EuiPopover
      data-test-subj="hostsViewPocSettingsPopover"
      button={
        <EuiButtonIcon
          aria-label="PoC settings"
          iconType="gear"
          color="text"
          display={allOn ? 'empty' : 'fill'}
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
          flags to isolate the cost of a single change (e.g. measure P15a in isolation, or compare
          P11 vs no-server-sort). Persisted in localStorage; resets to all-ON on a fresh browser.
        </EuiText>
        <EuiSpacer size="m" />

        <Section title="KPI tiles" defaultOpen>
          <Toggle
            proposal="P15b"
            label="Use ES|QL KPI endpoint"
            checked={settings.useKpiEndpoint}
            onChange={settings.setUseKpiEndpoint}
            dataTestSubj="hostsViewPocSettingsKpiEndpointSwitch"
            description={
              <>
                ON — one <EuiCode language="esql">STATS</EuiCode> request returns the four headline
                scalars. OFF — four parallel Lens <EuiCode>chartType: &apos;metric&apos;</EuiCode>{' '}
                charts (the legacy strip).
              </>
            }
          />
          <Toggle
            proposal="P15a"
            label="Drop KPI trendline"
            checked={settings.dropKpiTrendline}
            onChange={settings.setDropKpiTrendline}
            dataTestSubj="hostsViewPocSettingsKpiTrendlineSwitch"
            dependsOn="Only effective when 'Use ES|QL KPI endpoint' is OFF"
            description={
              <>
                ON — Lens KPI charts render without their per-tile <EuiCode>date_histogram</EuiCode>{' '}
                sparkline (current inventory-model default). OFF — restore{' '}
                <EuiCode>trendLine: true</EuiCode> so each tile fires a second aggregation (pre-P15a
                cost).
              </>
            }
          />
        </Section>

        <Section title="Hosts table">
          <Toggle
            proposal="P10"
            label="Use two-phase fetch (Phase A + Phase B)"
            checked={settings.useTwoPhaseFetch}
            onChange={settings.setUseTwoPhaseFetch}
            dataTestSubj="hostsViewPocSettingsTwoPhaseFetchSwitch"
            description={
              <>
                ON — cheap Phase A names + per-page Phase B metrics + alerts. OFF — legacy single{' '}
                <EuiCode>POST /api/metrics/infra/host</EuiCode> with the full result returned (the
                pre-PoC shape).
              </>
            }
          />
          <Toggle
            proposal="P11"
            label="Server-side sort &amp; pagination"
            checked={settings.useServerSideSort}
            onChange={settings.setUseServerSideSort}
            dataTestSubj="hostsViewPocSettingsServerSortSwitch"
            dependsOn="Only effective when 'Use two-phase fetch' is ON"
            description={
              <>
                ON — Phase A ranks the whole fleet by the chosen metric, server returns the page.
                OFF — server returns hosts in default order, client sorts the visible page only
                (same shape as today&apos;s unsupported-field fallback).
              </>
            }
          />
          <Toggle
            proposal="P5.6"
            label="Scoped alerts (visible page only)"
            checked={settings.useScopedAlerts}
            onChange={settings.setUseScopedAlerts}
            dataTestSubj="hostsViewPocSettingsScopedAlertsSwitch"
            dependsOn="Only effective when 'Use two-phase fetch' is ON"
            description={
              <>
                ON — alerts API aggregates over the ≤ 20 hosts on screen. OFF — aggregates over the
                full Phase A result (up to <EuiCode>limit</EuiCode>) and the table picks the
                relevant counts out by name (replicates pre-P5.6 cost).
              </>
            }
          />
          <Toggle
            proposal="P12"
            label="ES|QL Phase B (semconv)"
            checked={settings.useEsqlPhaseB}
            onChange={settings.setUseEsqlPhaseB}
            dataTestSubj="hostsViewPocSettingsEsqlPhaseBSwitch"
            dependsOn="Only effective when 'Use two-phase fetch' is ON and schema is semconv"
            description={
              <>
                ON — Phase B builds one ES|QL{' '}
                <EuiCode language="esql">FROM … STATS … BY host.name</EuiCode> query (single
                round-trip, filter-in-agg). OFF — force the DSL fallback path even on semconv to
                measure ES|QL&apos;s contribution to Phase B latency.
              </>
            }
          />
        </Section>

        <Section title="Metrics tab">
          <Toggle
            proposal="P16"
            label="Use timeseries endpoint"
            checked={settings.useMetricsTimeseriesEndpoint}
            onChange={settings.setUseMetricsTimeseriesEndpoint}
            dataTestSubj="hostsViewPocSettingsMetricsTimeseriesSwitch"
            description={
              <>
                ON — one <EuiCode>POST /host/metrics_timeseries</EuiCode> request returns all 11
                metric series for the visible page (single ES|QL query, counter rates derived
                server-side via bucket diffs). Eleven <EuiCode>@elastic/charts</EuiCode> line charts
                render the result. OFF — eleven Lens xy embeddables, each firing its own DSL{' '}
                <EuiCode>terms + date_histogram</EuiCode> per metric (pre-P16 shape).
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
          <Toggle
            proposal="P5.5"
            label="Ready gate (suppress double-fetch)"
            checked={settings.useReadyGate}
            onChange={settings.setUseReadyGate}
            dataTestSubj="hostsViewPocSettingsReadyGateSwitch"
            description={
              <>
                ON — fetches wait for <EuiCode>metricsView</EuiCode> + schema to settle so they fire
                once. OFF — fetches fire immediately on mount and re-fire when the gate resolves
                (original pre-P5.5 double-fire pattern).
              </>
            }
          />
        </Section>
      </div>
      <EuiPopoverFooter>
        <EuiText size="xs" color="subdued">
          PoC-only. All eleven flags ship as ON by default.
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

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
