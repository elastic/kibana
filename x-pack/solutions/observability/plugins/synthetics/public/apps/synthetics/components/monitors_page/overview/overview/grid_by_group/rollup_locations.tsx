/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUrlParams } from '../../../../../hooks';
import { selectOverviewState } from '../../../../../state';
import { setRollupLocations as setRollupLocationsAction } from '../../../../../state/overview';

export function RollupLocations() {
  const { rollupLocations } = useSelector(selectOverviewState);
  const dispatch = useDispatch();
  const setRollupLocations = useCallback(() => {
    dispatch(setRollupLocationsAction(!rollupLocations));
  }, [dispatch, rollupLocations]);
  useRollupUrlParamFlag({ rollupLocations, setRollupLocations });
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
              checked={!!rollupLocations}
              onChange={() => setRollupLocations()}
              showLabel={false}
              label=""
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function useRollupUrlParamFlag({
  rollupLocations,
  setRollupLocations,
}: {
  rollupLocations: boolean | null;
  setRollupLocations: React.Dispatch<React.SetStateAction<boolean | null>>;
}) {
  const [urlParams, updateUrlParams] = useUrlParams();
  const params = urlParams();
  const { rollupLocations: urlRollupLocations } = params;
  const isUrlHydrated = useRef(false);
  useEffect(() => {
    if (rollupLocations !== null && Boolean(urlRollupLocations) !== rollupLocations) {
      updateUrlParams({ rollupLocations: String(rollupLocations) });
    }
    isUrlHydrated.current = true;
  }, [rollupLocations, updateUrlParams, urlRollupLocations]);
  useEffect(() => {
    if (isUrlHydrated.current && rollupLocations === null && urlRollupLocations !== '') {
      setRollupLocations(urlRollupLocations === 'true');
    }
  }, [rollupLocations, setRollupLocations, urlRollupLocations]);
  useEffect(() => {
    const strFlag = String(rollupLocations);
    if (isUrlHydrated.current && rollupLocations !== null && strFlag !== urlRollupLocations) {
      updateUrlParams({ rollupLocations: strFlag });
    }
  });
}

const BY_LOCATION_TITLE = i18n.translate('xpack.synthetics.overview.controls.byLocation', {
  defaultMessage: 'By location',
});
