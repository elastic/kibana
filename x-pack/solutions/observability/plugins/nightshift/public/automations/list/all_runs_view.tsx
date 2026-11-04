/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import datemath from '@elastic/datemath';
import { EuiCallOut, EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { RunHistory, type Run } from '../detail_flyout/run_history';
import { useAutomationsRunsInRange, type Automation } from '../hooks/use_automations';
import type { TimeRange } from '../hooks/use_automation_usage';
import { AutomationsTimeRangePicker } from './time_range_picker';

const toBounds = ({ start, end }: TimeRange) => ({
  startedAfter: datemath.parse(start)!.toISOString(),
  startedBefore: datemath.parse(end, { roundUp: true })!.toISOString(),
});

export const AllRunsView = ({
  automations,
  onOpenRun,
}: {
  automations: Automation[];
  onOpenRun: (automationId: string) => void;
}) => {
  const [range, setRange] = useState<TimeRange>({ start: 'now-48h', end: 'now' });
  const [rangeLabel, setRangeLabel] = useState('Last 48 hours');
  const [bounds, setBounds] = useState(() => toBounds(range));
  const [selected, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const { startedAfter, startedBefore } = bounds;

  const ids = useMemo(() => automations.map(({ id }) => id), [automations]);
  const queries = useAutomationsRunsInRange(ids, startedAfter, startedBefore);
  const isLoading = queries.some(({ isLoading: loading }) => loading);
  const selectedIds = selected.map(({ value }) => value);

  const runs = queries
    .flatMap(({ data }, index): Run[] =>
      (data?.runs ?? []).map((run) => ({
        ...run,
        automationId: ids[index],
        automationName: automations[index].name,
      }))
    )
    .filter(({ automationId }) => !selectedIds.length || selectedIds.includes(automationId))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  const truncated = queries.some(({ data }) => data && data.total > data.runs.length);

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem>
          <EuiComboBox
            compressed
            placeholder="Filter by automation"
            aria-label="Filter by automation"
            options={automations.map(({ id, name }) => ({ label: name, value: id }))}
            selectedOptions={selected}
            onChange={setSelected}
            data-test-subj="allRunsAutomationFilter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AutomationsTimeRangePicker
            onRangeChange={(next, label) => {
              setRange(next);
              setRangeLabel(label);
              setBounds(toBounds(next));
            }}
            onRefresh={() => setBounds(toBounds(range))}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {truncated && (
        <>
          <EuiCallOut
            size="s"
            announceOnMount={false}
            title="Some automations have more than 100 runs in this range. Only the latest 100 each are shown."
          />
          <EuiSpacer size="m" />
        </>
      )}
      <RunHistory
        runs={runs}
        isLoading={isLoading}
        startedAfter={startedAfter}
        startedBefore={startedBefore}
        rangeLabel={rangeLabel}
        automationName=""
        onSelect={({ automationId }) => automationId && onOpenRun(automationId)}
      />
    </>
  );
};
