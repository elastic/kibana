/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiTitle,
} from '@elastic/eui';
import type { PhaseId } from '@kbn/pnd-common';
import * as i18n from './translations';

/**
 * One heading per phase of the four-phase lifecycle. The phase number is part of
 * the copy so a row numbered `2.7` is locatable at a glance.
 */
export const PHASE_LABELS: Record<PhaseId, string> = {
  incident_response: i18n.PHASE_INCIDENT_RESPONSE,
  investigation: i18n.PHASE_INVESTIGATION,
  post_incident: i18n.PHASE_POST_INCIDENT,
  signal_triage: i18n.PHASE_SIGNAL_TRIAGE,
};

export interface PhaseGroupProps {
  children: React.ReactNode;
  /** How many rows the group holds. Rendered even when it is `0`. */
  count: number;
  /** Groups start expanded: a collapsed flyout hides the thing it was opened for. */
  initialIsOpen?: boolean;
  phase: PhaseId;
}

/**
 * Collapsible shell for one phase of the four-phase execution view.
 *
 * Presentational only: the caller groups its rows (see
 * `helpers/group_catalog_entries_by_phase`) and passes them as children, so the
 * flyout and any other consumer share one header, one count and one toggle.
 */
export const PhaseGroup: React.FC<PhaseGroupProps> = ({
  children,
  count,
  initialIsOpen = true,
  phase,
}) => (
  <div data-phase={phase} data-test-subj="pndPhaseGroup">
    <EuiAccordion
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{PHASE_LABELS[phase]}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued" data-test-subj="pndPhaseGroupCount">
              {i18n.stepCount(count)}
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={`pndPhaseGroup-${phase}`}
      initialIsOpen={initialIsOpen}
      paddingSize="s"
    >
      {children}
    </EuiAccordion>
  </div>
);
