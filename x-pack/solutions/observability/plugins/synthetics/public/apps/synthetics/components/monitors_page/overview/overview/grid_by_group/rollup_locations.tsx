/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function RollupLocations({
  rollupLocations,
  setRollupLocations,
}: {
  rollupLocations: boolean;
  setRollupLocations: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <span>{BY_LOCATION_TITLE}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              checked={rollupLocations}
              onChange={() => setRollupLocations(!rollupLocations)}
              showLabel={false}
              label=""
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const BY_LOCATION_TITLE = i18n.translate('xpack.synthetics.overview.controls.byLocation', {
  defaultMessage: 'By location',
});
