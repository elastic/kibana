/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback, useEffect } from 'react';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import { EuiSpacer } from '@elastic/eui';
import { buildPhrasesFilter } from '@kbn/es-query';
import { AlertTlsCondition } from './alert_tls';
import { getDynamicSettingsAction, selectDynamicSettings } from '../../state/settings';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';
import { AlertSearchBar } from './query_bar';
import { TLSRuleViz } from './tls_rule_viz';
import { useSyntheticsDataView } from '../../contexts/synthetics_data_view_context';
import { FieldFilters } from './common/field_filters';
import { MonitorTypeEnum } from '../monitor_add_edit/types';

export type TLSRuleParamsProps = RuleTypeParamsExpressionProps<TLSRuleParams>;

const tlsMonitorTypes = [MonitorTypeEnum.HTTP, MonitorTypeEnum.TCP];

export const TLSRuleComponent: React.FC<{
  ruleParams: TLSRuleParamsProps['ruleParams'];
  setRuleParams: TLSRuleParamsProps['setRuleParams'];
}> = ({ ruleParams, setRuleParams }) => {
  const dispatch = useDispatch();

  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (typeof settings === 'undefined') {
      dispatch(getDynamicSettingsAction.get());
    }
  }, [dispatch, settings]);

  const onFiltersChange = useCallback(
    (val: { kqlQuery?: string }) => {
      setRuleParams('kqlQuery', val.kqlQuery);
    },
    [setRuleParams]
  );

  const dataView = useSyntheticsDataView();
  const monitorTypeField = dataView?.getFieldByName('monitor.type');

  // filtersForSuggestions can be applied only if dataView and monitorTypeField are available
  const filtersForSuggestions =
    dataView && monitorTypeField
      ? [buildPhrasesFilter(monitorTypeField, tlsMonitorTypes, dataView)]
      : undefined;

  return (
    <>
      <AlertSearchBar
        kqlQuery={ruleParams.kqlQuery ?? ''}
        onChange={onFiltersChange}
        filtersForSuggestions={filtersForSuggestions}
      />
      <EuiSpacer size="m" />
      <FieldFilters
        ruleParams={ruleParams}
        setRuleParams={setRuleParams}
        filters={{ monitorTypes: tlsMonitorTypes }}
      />
      <TLSRuleViz ruleParams={ruleParams} />
      <EuiSpacer size="m" />
      <AlertTlsCondition
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
