/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { LifecyclePhase, WatchWorker } from '@kbn/pnd-common';
import { PHASE_LABELS } from '../../../components/phase_group/phase_group';
import { WatchBadges } from './watch_badges';
import {
  flushLastRowStyles,
  hiddenColumnHeaderStyles,
  oneLineCellStyles,
  truncatedDescriptionStyles,
} from './table_styles';
import * as i18n from '../workers/translations';

/**
 * ⛔ There is deliberately no Enabled column here, and no switch of any kind (bead kibana-phf4.33).
 *
 * A Worker is a read-only projection of an `ai.agent` step of a Watch lane, so there was never a flag
 * behind the control: `PATCH /internal/pnd/workers/{workerId}` refuses every request (kibana-phf4.6).
 * Until the 2026-08-10 declutter this table answered that with a switch rendered checked-and-disabled
 * plus a tooltip carrying the reason. The design then removed the per-row enable toggles from the
 * watch detail page and both catalogs outright, which is the stronger form of the same answer — a
 * control a customer cannot use is still a control they have to read past.
 *
 * If a Worker ever becomes something the orchestrator dispatches to, the affordance to add is not a
 * toggle on this row; see follow-up `kibana-zzef` and register `#39`.
 */
const WorkerCell: React.FC<{ workerId: string }> = ({ workerId }) => {
  const description = i18n.workerDescription(workerId);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{i18n.workerName(workerId)}</strong>
        </EuiText>
      </EuiFlexItem>
      {description ? (
        <EuiFlexItem grow={false}>
          {/* One line only — the full text is the title, per the 2026-08-10 declutter. */}
          <EuiText size="xs" color="subdued">
            <span css={truncatedDescriptionStyles} title={description}>
              {description}
            </span>
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

/**
 * The agent the step runs, and the skills that agent is configured with.
 *
 * Skill ids are rendered raw on purpose: they belong to Agent Builder, which owns their copy, so
 * translating them here would invent names for things PND does not define.
 */
const AgentCell: React.FC<{ agentName: string; skillIds: string[] }> = ({
  agentName,
  skillIds,
}) => (
  <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{agentName}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {skillIds.length > 0 ? i18n.workerSkills(skillIds.join(', ')) : i18n.NO_SKILLS}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const WORKER_COLUMN: EuiBasicTableColumn<WatchWorker> = {
  field: 'id',
  name: i18n.COL_WORKER,
  render: (id: string) => <WorkerCell workerId={id} />,
};

const PHASE_COLUMN: EuiBasicTableColumn<WatchWorker> = {
  field: 'phase',
  name: i18n.COL_PHASE,
  width: '160px',
  render: (phase: LifecyclePhase) => <EuiText size="s">{PHASE_LABELS[phase]}</EuiText>,
};

const AGENT_COLUMN: EuiBasicTableColumn<WatchWorker> = {
  field: 'agentName',
  name: i18n.COL_AGENT,
  width: '260px',
  render: (agentName: string, worker: WatchWorker) => (
    <AgentCell agentName={agentName} skillIds={worker.skillIds} />
  ),
};

const WATCHES_COLUMN: EuiBasicTableColumn<WatchWorker> = {
  field: 'watchIds',
  name: i18n.COL_WATCHES,
  width: '220px',
  render: (watchIds: string[]) => <WatchBadges watchIds={watchIds} />,
};

export interface WorkerCatalogTableProps {
  caption: string;
  'data-test-subj': string;
  error?: string;
  /**
   * Hides the column header row (2026-08-13 declutter). On for the watch detail page's section, whose
   * title already names the list; **off** for the standalone Workers catalog, where the header is the
   * affordance for a multi-column table a customer scans. `caption` becomes the accessible name when
   * this is on, so it is required either way.
   */
  hideColumnHeaders?: boolean;
  loading?: boolean;
  noItemsMessage: string;
  /** Off for a per-watch table, which already knows the watch it is rendered under. */
  showWatches: boolean;
  workers: WatchWorker[];
}

/**
 * Renders projected Workers. Shared by the Workers page and the per-watch Workers section so both
 * describe a step the same way, and neither can drift into offering a control the other refuses.
 *
 * Presentational: the caller reads `useWorkers` and, for a watch, filters by `watchIds`.
 *
 * Left on EUI's default `tableLayout="fixed"` rather than `auto`, because the Worker column's
 * one-line description can only ellipsise inside a bounded cell.
 */
export const WorkerCatalogTable: React.FC<WorkerCatalogTableProps> = ({
  caption,
  'data-test-subj': dataTestSubj,
  error,
  hideColumnHeaders = false,
  loading,
  noItemsMessage,
  showWatches,
  workers,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WatchWorker>>>(
    () => [WORKER_COLUMN, PHASE_COLUMN, AGENT_COLUMN, ...(showWatches ? [WATCHES_COLUMN] : [])],
    [showWatches]
  );

  return (
    <EuiBasicTable
      items={workers}
      columns={columns}
      css={[
        flushLastRowStyles,
        oneLineCellStyles,
        ...(hideColumnHeaders ? [hiddenColumnHeaderStyles] : []),
      ]}
      tableCaption={caption}
      loading={loading}
      error={error}
      noItemsMessage={noItemsMessage}
      data-test-subj={dataTestSubj}
    />
  );
};
