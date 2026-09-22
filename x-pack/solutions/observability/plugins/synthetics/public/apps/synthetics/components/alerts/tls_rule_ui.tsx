/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux-v7';
import React, { useCallback, useEffect } from 'react';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import {
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildPhrasesFilter } from '@kbn/es-query';
import { AlertTlsCondition } from './alert_tls';
import { getDynamicSettingsAction, selectDynamicSettings } from '../../state/settings';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';
import { FIRST_PARTY } from '../../../../../common/requests/get_certs_request_body';
import { AlertSearchBar } from './query_bar';
import { TLSRuleViz } from './tls_rule_viz';
import { useSyntheticsDataView } from '../../contexts/synthetics_data_view_context';
import { FieldFilters } from './common/field_filters';
import { CertQuickFilter } from '../certificates/cert_quick_filter';
import {
  BROWSER_RESOURCE_TYPE_OPTIONS,
  PARTY_FILTER_OPTIONS,
} from '../certificates/cert_filter_options';
import * as certLabels from '../certificates/translations';
import { MonitorTypeEnum } from '../monitor_add_edit/types';

export type TLSRuleParamsProps = RuleTypeParamsExpressionProps<TLSRuleParams>;

const LIGHTWEIGHT_MONITOR_TYPES = [MonitorTypeEnum.HTTP, MonitorTypeEnum.TCP];
const ALL_TLS_MONITOR_TYPES = [...LIGHTWEIGHT_MONITOR_TYPES, MonitorTypeEnum.BROWSER];

const INCLUDE_BROWSER_CERTS_LABEL = i18n.translate(
  'xpack.synthetics.tlsRule.includeBrowserCerts.label',
  { defaultMessage: 'Include browser monitor certificates' }
);

const FILTER_SECTION_TITLE = i18n.translate('xpack.synthetics.tlsRule.filterSection.title', {
  defaultMessage: 'Monitors',
});

const CERT_TYPE_SECTION_TITLE = i18n.translate('xpack.synthetics.tlsRule.certTypeSection.title', {
  defaultMessage: 'Certificate type',
});

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

  const includeBrowserCerts = ruleParams.includeBrowserCerts ?? false;

  const onToggleBrowserCerts = useCallback(
    (checked: boolean) => {
      setRuleParams('includeBrowserCerts', checked);
      if (checked) {
        // Default to first-party so the rule alerts on the monitored site's own
        // certificates rather than every third-party CDN/ad/analytics host a
        // browser journey happens to touch.
        if (!ruleParams.certOrigin || ruleParams.certOrigin.length === 0) {
          setRuleParams('certOrigin', [FIRST_PARTY]);
        }
      } else {
        // Clear browser-only filters so disabling the toggle leaves no dangling
        // params that would silently do nothing on the lightweight-only path.
        setRuleParams('certOrigin', undefined);
        setRuleParams('browserResourceTypes', undefined);
      }
    },
    [ruleParams.certOrigin, setRuleParams]
  );

  const tlsMonitorTypes = includeBrowserCerts ? ALL_TLS_MONITOR_TYPES : LIGHTWEIGHT_MONITOR_TYPES;

  const dataView = useSyntheticsDataView();
  const monitorTypeField = dataView?.getFieldByName('monitor.type');

  // filtersForSuggestions can be applied only if dataView and monitorTypeField are available
  const filtersForSuggestions =
    dataView && monitorTypeField
      ? [buildPhrasesFilter(monitorTypeField, tlsMonitorTypes, dataView)]
      : undefined;

  return (
    <>
      <EuiTitle size="xs">
        <h3>{FILTER_SECTION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
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
      <EuiHorizontalRule size="half" margin="s" />
      <EuiTitle size="xs">
        <h3>{CERT_TYPE_SECTION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={INCLUDE_BROWSER_CERTS_LABEL}
            checked={includeBrowserCerts}
            onChange={(e) => onToggleBrowserCerts(e.target.checked)}
            data-test-subj="syntheticsTLSRuleIncludeBrowserCerts"
          />
        </EuiFlexItem>
        {includeBrowserCerts && (
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <CertQuickFilter
                label={certLabels.PARTY_FILTER}
                dataTestSubj="syntheticsTLSRulePartyFilter"
                options={PARTY_FILTER_OPTIONS}
                selectedValues={ruleParams.certOrigin ?? []}
                onChange={(values) =>
                  setRuleParams('certOrigin', values.length > 0 ? values : undefined)
                }
              />
              <CertQuickFilter
                label={certLabels.RESOURCE_TYPE_FILTER}
                dataTestSubj="syntheticsTLSRuleResourceTypeFilter"
                options={BROWSER_RESOURCE_TYPE_OPTIONS}
                selectedValues={ruleParams.browserResourceTypes ?? []}
                onChange={(values) =>
                  setRuleParams('browserResourceTypes', values.length > 0 ? values : undefined)
                }
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule size="half" margin="s" />
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
