/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype-only State selector (full / empty / loading / error) shared by the
 * right-panel Behavioral anomalies section and the BA-v.3 left tab.
 *
 * Cleanup: delete with both call sites and `behavioral_anomalies_v3_content_state.ts`.
 */

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  BEHAVIORAL_ANOMALIES_V3_CONTENT_STATE_OPTIONS,
  type BehavioralAnomaliesV3ContentState,
} from './behavioral_anomalies_v3_content_state';

interface BehavioralAnomaliesV3StateSelectorProps {
  contentState: BehavioralAnomaliesV3ContentState;
  onChange: (state: BehavioralAnomaliesV3ContentState) => void;
  'data-test-subj'?: string;
}

export const BehavioralAnomaliesV3StateSelector: React.FC<
  BehavioralAnomaliesV3StateSelectorProps
> = ({ contentState, onChange, 'data-test-subj': dataTestSubj }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.behavioralAnomalies.stateSelectorLabel',
          { defaultMessage: 'State:' }
        )}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend={i18n.translate(
          'xpack.securitySolution.entityAnalytics.behavioralAnomalies.stateSelectorLegend',
          { defaultMessage: 'Behavioral anomalies section content state' }
        )}
        options={BEHAVIORAL_ANOMALIES_V3_CONTENT_STATE_OPTIONS}
        idSelected={contentState}
        onChange={(id) => onChange(id as BehavioralAnomaliesV3ContentState)}
        buttonSize="compressed"
        data-test-subj={dataTestSubj}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
