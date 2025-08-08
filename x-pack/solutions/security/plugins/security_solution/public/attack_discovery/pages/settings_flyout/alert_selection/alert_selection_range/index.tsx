/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SingleRangeChangeEvent } from '@kbn/elastic-assistant';
import { AlertsRange } from '@kbn/elastic-assistant';
import React, { useCallback } from 'react';

import * as i18n from '../translations';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';

export const MAX_ALERTS = 500;
export const MIN_ALERTS = 50;
export const STEP = 50;
export const NO_INDEX_PATTERNS: DataView[] = [];

interface Props {
  maxAlerts: number;
  setMaxAlerts: (value: string) => void;
}

const AlertSelectionRangeComponent: React.FC<Props> = ({ maxAlerts, setMaxAlerts }) => {
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  // called when the slider changes the number of alerts to analyze:
  const onChangeAlertsRange = useCallback(
    (e: SingleRangeChangeEvent) => {
      setMaxAlerts(e.currentTarget.value);
    },
    [setMaxAlerts]
  );

  return (
    <EuiFlexGroup data-test-subj="alertSelectionRange" direction="column" gutterSize="none">
      {!attackDiscoveryAlertsEnabled && (
        <EuiFlexItem grow={false}>
          <EuiTitle data-test-subj="title" size="xs">
            <h3>{i18n.SET_NUMBER_OF_ALERTS_TO_ANALYZE}</h3>
          </EuiTitle>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AlertsRange
          maxAlerts={MAX_ALERTS}
          minAlerts={MIN_ALERTS}
          onChange={onChangeAlertsRange}
          step={STEP}
          value={maxAlerts}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText color="subdued" data-test-subj="sendFewerAlerts" size="xs">
          <span>{i18n.SEND_FEWER_ALERTS}</span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AlertSelectionRangeComponent.displayName = 'AlertSelectionRange';

export const AlertSelectionRange = React.memo(AlertSelectionRangeComponent);
