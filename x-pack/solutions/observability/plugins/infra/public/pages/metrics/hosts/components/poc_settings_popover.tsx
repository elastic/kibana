/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PoC-only — gear popover that exposes the two perf-experiment switches so a
// reviewer can flip between "before" and "after" without rebuilding. Hard-
// coded English copy because this surface is not user-facing; remove the
// whole component before merge.

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiSwitch,
  EuiSpacer,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import { usePocSettingsContext } from '../hooks/use_poc_settings';

// Names of the proposals each toggle flips. Pulled into constants so the
// label and the help text stay in sync — and so the popover doubles as a
// quick checklist of what's actually in flight.
const KPI_TOGGLE_PROPOSALS = ['P15a', 'P15b'];
const TABLE_TOGGLE_PROPOSALS = ['P5.6', 'P10', 'P11', 'P12 (semconv)'];
const UNIVERSAL_TOGGLE_PROPOSALS = ['P1', 'P2', 'P5', 'P5.5'];

export const PocSettingsPopover = () => {
  const [open, setOpen] = useState(false);
  const {
    useNewKpis,
    useNewTable,
    useUniversalFixes,
    setUseNewKpis,
    setUseNewTable,
    setUseUniversalFixes,
  } = usePocSettingsContext();
  const allOn = useNewKpis && useNewTable && useUniversalFixes;

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
      <div style={{ maxWidth: 320 }}>
        <EuiText size="xs" color="subdued">
          Flip these off to compare the Hosts page against the pre-Tier-3 codepath. Persisted in
          localStorage; resets to ON on a fresh browser.
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          checked={useNewKpis}
          onChange={(event) => setUseNewKpis(event.target.checked)}
          label={`Use new KPI tiles (${KPI_TOGGLE_PROPOSALS.join(' + ')})`}
          data-test-subj="hostsViewPocSettingsKpiSwitch"
        />
        <EuiText size="xs" color="subdued">
          ON — one ES|QL <EuiCode language="esql">STATS</EuiCode> request, no trendline. OFF — four
          Lens charts with <EuiCode>trendLine: true</EuiCode> restored (legacy).
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          checked={useNewTable}
          onChange={(event) => setUseNewTable(event.target.checked)}
          label={`Use new Hosts table (${TABLE_TOGGLE_PROPOSALS.join(' + ')})`}
          data-test-subj="hostsViewPocSettingsTableSwitch"
        />
        <EuiText size="xs" color="subdued">
          ON — two-phase fetch:
          <ul style={{ marginTop: 4, marginBottom: 4, paddingLeft: 16 }}>
            <li>
              <strong>P10</strong> — cheap Phase A names + per-page Phase B metrics.
            </li>
            <li>
              <strong>P11</strong> — server-side sort &amp; pagination.
            </li>
            <li>
              <strong>P12</strong> — single ES|QL <EuiCode>VALUES(...)</EuiCode> for metadata inline
              with metrics (semconv).
            </li>
            <li>
              <strong>P5.6</strong> — alerts scoped to the visible page&apos;s infra-bearing hosts.
            </li>
          </ul>
          OFF — legacy <EuiCode>POST /api/metrics/infra/host</EuiCode> with client-side sort and
          pagination over the full result.
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          checked={useUniversalFixes}
          onChange={(event) => setUseUniversalFixes(event.target.checked)}
          label={`Use universal fixes (${UNIVERSAL_TOGGLE_PROPOSALS.join(' + ')})`}
          data-test-subj="hostsViewPocSettingsUniversalSwitch"
        />
        <EuiText size="xs" color="subdued">
          The plumbing wins that aren&apos;t architectural. ON — current behaviour:
          <ul style={{ marginTop: 4, marginBottom: 4, paddingLeft: 16 }}>
            <li>
              <strong>P1</strong> — <EuiCode>terms</EuiCode> instead of <EuiCode>OR</EuiCode>-of-
              <EuiCode>match_phrase</EuiCode> in <EuiCode>buildCombinedAssetFilter</EuiCode>.
            </li>
            <li>
              <strong>P2</strong> — single-field KQL{' '}
              <EuiCode>host.name: (&quot;a&quot; or &quot;b&quot;)</EuiCode> on the Open-in-Alerts
              link.
            </li>
            <li>
              <strong>P5</strong> — drop the redundant outer <EuiCode>bool</EuiCode> wrap in{' '}
              <EuiCode>InfraMetricsClient.search</EuiCode> when no excluded tier filter applies
              (sent server-side via <EuiCode>x-poc-legacy-bool-wrap</EuiCode>).
            </li>
            <li>
              <strong>P5.5</strong> — <EuiCode>isReady</EuiCode> gate that suppresses the
              first-paint double fetch on the Hosts endpoints.
            </li>
          </ul>
          OFF — every clause above reverts to its pre-PR shape. P3 (kept{' '}
          <EuiCode>top_metrics</EuiCode> for metadata) is a no-op decision documented in code, so
          it&apos;s unaffected by this toggle.
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiText size="xs" color="subdued">
          PoC-only. All three flags ship as ON by default.
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
