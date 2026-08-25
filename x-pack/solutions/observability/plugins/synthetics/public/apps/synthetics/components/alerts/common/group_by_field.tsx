/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSwitch } from '@elastic/eui';

export const GroupByExpression = ({
  onChange,
  groupByLocation,
  locationsThreshold,
}: {
  locationsThreshold: number;
  groupByLocation: boolean;
  onChange: (val: boolean) => void;
}) => {
  const disabledGroupBy = locationsThreshold > 1;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          compressed
          disabled={disabledGroupBy}
          label={i18n.translate('xpack.synthetics.groupByExpression.euiSwitch.groupByLabel', {
            defaultMessage: 'Receive distinct alerts for each location',
          })}
          checked={groupByLocation}
          onChange={(e) => onChange(e.target.checked)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {disabledGroupBy ? (
          <EuiIconTip
            content={i18n.translate('xpack.synthetics.groupByExpression.euiSwitch.tooltip', {
              defaultMessage:
                'When locations threshold is greater than 1, group by location is disabled.',
            })}
          />
        ) : (
          <EuiIconTip
            content={i18n.translate('xpack.synthetics.groupByExpression.euiSwitch.tooltip', {
              defaultMessage:
                'When the monitor detects a failure on one or more locations, you receive an alert for each of these locations, instead of a single alert.',
            })}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
