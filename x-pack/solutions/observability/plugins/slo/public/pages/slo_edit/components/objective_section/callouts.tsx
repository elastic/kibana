/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { OBJECTIVE_LABELS } from './objective_section_labels';

export function ServerlessWarningCallout() {
  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut announceOnMount>{OBJECTIVE_LABELS.serverlessWarning}</EuiCallOut>
    </EuiFlexItem>
  );
}

export function TimesliceMetricCallout() {
  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut announceOnMount color="warning">
        <p>
          <FormattedMessage
            id="xpack.slo.sloEdit.sliType.timesliceMetric.objectiveMessage"
            defaultMessage="The timeslice metric requires the budgeting method to be set to 'Timeslices' due to the nature of the statistical aggregations. The 'timeslice target' is also ignored in favor of the 'threshold' set in the metric definition above. The 'timeslice window' will set the size of the window the aggregation is performed on."
          />
        </p>
      </EuiCallOut>
    </EuiFlexItem>
  );
}

export function SyntheticsAvailabilityCallout() {
  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut announceOnMount color="warning">
        <p>
          <FormattedMessage
            id="xpack.slo.sloEdit.sliType.syntheticAvailability.objectiveMessage"
            defaultMessage="The Synthetics availability indicator requires the budgeting method to be set to 'Occurrences'."
          />
        </p>
      </EuiCallOut>
    </EuiFlexItem>
  );
}
