/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { PhaseStepStatusBadge } from '../phase_step_status_badge';
import type { LifecycleRow, LifecycleStepLine } from './helpers/build_lifecycle_rows';
import { LifecycleStepLink } from './lifecycle_step_link';
import * as i18n from './translations';

interface LifecycleTimestampProps {
  label: string;
  testSubj: string;
  value: string;
}

/**
 * A raw ISO timestamp inside `<time dateTime>`, matching the convention the rest of PND uses: it is
 * assertable without pinning a timezone in tests, and machine-readable for anything that reads the
 * DOM.
 */
const LifecycleTimestamp: React.FC<LifecycleTimestampProps> = ({ label, testSubj, value }) => (
  <EuiText color="subdued" size="xs">
    {`${label}: `}
    <time dateTime={value} data-test-subj={testSubj}>
      {value}
    </time>
  </EuiText>
);

interface SubordinateLineProps {
  line: LifecycleStepLine;
}

/**
 * How a row is named to assistive technology: "Open an incident".
 *
 * Every step link reads "View step" and every conversation button reads "Open conversation", so
 * without this the lifecycle presents 14 links and up to 3 buttons with identical accessible names.
 * The label alone distinguishes them: catalog labels are unique, and kibana-phf4.12 dropped the
 * numbering that used to prefix them.
 */
const stepName = ({ label }: LifecycleStepLine['entry']): string => label;

/**
 * A catalog row that names the same orchestrator step as the row above it.
 *
 * It carries no status badge of its own — the pair resolves to one step execution server-side, so a
 * second badge could only ever repeat the first or contradict it. It does keep its own link, so all
 * 14 catalog rows remain individually addressable.
 */
const SubordinateLine: React.FC<SubordinateLineProps> = ({ line: { entry, projection } }) => (
  <EuiFlexGroup
    alignItems="center"
    data-phase-step-id={entry.id}
    data-test-subj="pndLifecycleSubordinateLine"
    gutterSize="s"
    responsive={false}
  >
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.SAME_STEP_EXECUTION_TOOLTIP}>
        <EuiBadge color="hollow" tabIndex={0}>
          {i18n.SAME_STEP_EXECUTION}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText color="subdued" size="xs">
        {entry.label}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <LifecycleStepLink
        ariaLabel={i18n.viewStepAriaLabel(stepName(entry))}
        projection={projection}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface LifecycleStepRowProps {
  /** Row-specific evidence, e.g. the phase-4 tuning proposal and its backtest. */
  evidence?: React.ReactNode;
  /** Given only when the row's Agent Builder conversation really exists. */
  onOpenConversation?: () => void;
  row: LifecycleRow;
}

/**
 * One row of the four-phase lifecycle: what the step is, what happened, and a link to the step
 * execution that proves it.
 *
 * Every `live` row links to the step execution that realizes it. The two `upstream` rows carry no
 * link, because no PND step execution realizes them — Attack Discovery does that work before PND is
 * invoked — so {@link LifecycleStepLink} says so in words instead of offering a link that would go
 * nowhere.
 */
export const LifecycleStepRow: React.FC<LifecycleStepRowProps> = ({
  evidence,
  onOpenConversation,
  row: { entry, projection, status, subordinates },
}) => (
  <>
    <EuiPanel
      data-phase-step-id={entry.id}
      data-status={status}
      data-test-subj="pndLifecycleStepRow"
      hasBorder
      hasShadow={false}
      paddingSize="s"
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{entry.label}</strong>
          </EuiText>
          <EuiText color="subdued" size="xs">
            {entry.description}
          </EuiText>
          {projection?.startedAt != null ? (
            <LifecycleTimestamp
              label={i18n.STARTED_AT}
              testSubj="pndLifecycleStepStartedAt"
              value={projection.startedAt}
            />
          ) : null}
          {projection?.finishedAt != null ? (
            <LifecycleTimestamp
              label={i18n.FINISHED_AT}
              testSubj="pndLifecycleStepFinishedAt"
              value={projection.finishedAt}
            />
          ) : null}
          {subordinates.length > 0 ? (
            <>
              <EuiSpacer size="xs" />
              {subordinates.map((line) => (
                <SubordinateLine key={line.entry.id} line={line} />
              ))}
            </>
          ) : null}
          {evidence != null ? (
            <>
              <EuiSpacer size="s" />
              {evidence}
            </>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <PhaseStepStatusBadge status={status} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LifecycleStepLink
                ariaLabel={i18n.viewStepAriaLabel(stepName(entry))}
                projection={projection}
              />
            </EuiFlexItem>
            {onOpenConversation != null ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  aria-label={i18n.openConversationAriaLabel(stepName(entry))}
                  data-test-subj="pndLifecycleOpenConversation"
                  flush="both"
                  iconType="discuss"
                  onClick={onOpenConversation}
                  size="xs"
                >
                  {i18n.OPEN_CONVERSATION}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
    <EuiSpacer size="xs" />
  </>
);
