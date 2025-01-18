/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback, useEffect } from 'react';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { useSnapShotCount } from './use_snap_shot';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { TLSParams } from '../../../../../../common/runtime_types/alerts/tls';
import { AlertTlsComponent } from '../alert_tls';
import { selectDynamicSettings } from '../../../../state/selectors';
import { getDynamicSettings } from '../../../../state/actions/dynamic_settings';
import { AlertQueryBar } from '../alert_query_bar/query_bar';
import { AlertMonitorCount } from '../monitor_status_alert/alert_monitor_status';

export const AlertTls: React.FC<{
  id?: string;
  stackVersion?: string;
  ruleParams: RuleTypeParamsExpressionProps<TLSParams>['ruleParams'];
  setRuleParams: RuleTypeParamsExpressionProps<TLSParams>['setRuleParams'];
}> = ({ id, stackVersion, ruleParams, setRuleParams }) => {
  const dispatch = useDispatch();

  const { settings } = useSelector(selectDynamicSettings);

  const { count, loading } = useSnapShotCount({
    query: ruleParams.search ?? '',
  });

  useEffect(() => {
    if (!id && stackVersion && !ruleParams.stackVersion) {
      setRuleParams('stackVersion', stackVersion);
    }
  }, [ruleParams, id, stackVersion, setRuleParams]);

  useEffect(() => {
    if (typeof settings === 'undefined') {
      dispatch(getDynamicSettings());
    }
  }, [dispatch, settings]);

  const onSearchChange = useCallback(
    (value: string) => {
      setRuleParams('search', value === '' ? undefined : value);
    },
    [setRuleParams]
  );

  return (
    <>
      <AlertMonitorCount count={count.total} loading={loading} />

      <EuiSpacer size="s" />

      <AlertQueryBar query={ruleParams.search || ''} onChange={onSearchChange} />

      <AlertTlsComponent
        ageThreshold={
          ruleParams.certAgeThreshold ??
          settings?.certAgeThreshold ??
          DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold
        }
        expirationThreshold={
          ruleParams.certExpirationThreshold ??
          settings?.certExpirationThreshold ??
          DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold
        }
        setAgeThreshold={(value) => setRuleParams('certAgeThreshold', Number(value))}
        setExpirationThreshold={(value) => setRuleParams('certExpirationThreshold', Number(value))}
      />
    </>
  );
};
