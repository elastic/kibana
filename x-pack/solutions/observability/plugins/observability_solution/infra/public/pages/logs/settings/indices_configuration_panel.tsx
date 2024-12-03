/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import {
  logIndexNameReferenceRT,
  LogDataViewReference,
  logDataViewReferenceRT,
  LogIndexReference,
  logSourcesKibanaAdvancedSettingRT,
} from '@kbn/logs-shared-plugin/common';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers, LOG_THRESHOLD_ALERT_TYPE_ID } from '@kbn/rule-data-utils';

import { rulesLocatorID, RulesParams } from '@kbn/observability-plugin/public';
import { EuiLink } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { FormElement, isFormElementForType } from './form_elements';
import { IndexNamesConfigurationPanel } from './index_names_configuration_panel';
import { IndexPatternConfigurationPanel } from './index_pattern_configuration_panel';
import { FormValidationError } from './validation_errors';
import { KibanaAdvancedSettingConfigurationPanel } from './kibana_advanced_setting_configuration_panel';

export const IndicesConfigurationPanel = React.memo<{
  isLoading: boolean;
  isReadOnly: boolean;
  indicesFormElement: FormElement<LogIndexReference | undefined, FormValidationError>;
}>(({ isLoading, isReadOnly, indicesFormElement }) => {
  const {
    services: {
      http,
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();
  const [numberOfLogsRules, setNumberOfLogsRules] = useState(0);

  const rulesLocator = locators.get<RulesParams>(rulesLocatorID);
  const viewAffectedRulesLink = rulesLocator?.useUrl({ type: [LOG_THRESHOLD_ALERT_TYPE_ID] });

  const trackChangeIndexSourceType = useUiTracker({ app: 'infra_logs' });

  const changeToIndexPatternType = useCallback(() => {
    if (logDataViewReferenceRT.is(indicesFormElement.initialValue)) {
      indicesFormElement.updateValue(() => indicesFormElement.initialValue);
    } else {
      indicesFormElement.updateValue(() => undefined);
    }

    trackChangeIndexSourceType({
      metric: 'configuration_switch_to_index_pattern_reference',
    });
  }, [indicesFormElement, trackChangeIndexSourceType]);

  const changeToIndexNameType = useCallback(() => {
    if (indicesFormElement.initialValue?.type === 'index_name') {
      indicesFormElement.updateValue(() => indicesFormElement.initialValue);
    } else {
      indicesFormElement.updateValue(() => ({
        type: 'index_name',
        indexName: '',
      }));
    }

    trackChangeIndexSourceType({
      metric: 'configuration_switch_to_index_names_reference',
    });
  }, [indicesFormElement, trackChangeIndexSourceType]);

  const changeToKibanaAdvancedSettingType = useCallback(() => {
    // This is always a readonly value, synced with the setting, we just reset back to the correct type.
    indicesFormElement.updateValue(() => ({
      type: 'kibana_advanced_setting',
    }));

    trackChangeIndexSourceType({
      metric: 'configuration_switch_to_kibana_advanced_setting_reference',
    });
  }, [indicesFormElement, trackChangeIndexSourceType]);

  useEffect(() => {
    const getNumberOfInfraRules = async () => {
      if (http) {
        const { ruleExecutionStatus } = await loadRuleAggregations({
          http,
          ruleTypeIds: [LOG_THRESHOLD_ALERT_TYPE_ID],
          consumers: [AlertConsumers.LOGS, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
        });
        const numberOfRules = Object.values(ruleExecutionStatus).reduce(
          (acc, value) => acc + value,
          0
        );
        setNumberOfLogsRules(numberOfRules);
      }
    };
    getNumberOfInfraRules();
  }, [http]);

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.logSourcesTitle"
                defaultMessage="Log sources"
              />
            </h3>
          </EuiTitle>
        ),
      }}
    >
      {' '}
      <EuiCheckableCard
        id="kibanaAdvancedSetting"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.kibanaAdvancedSettingSectionTitle"
                defaultMessage="Kibana log sources advanced setting"
              />
            </h2>
          </EuiTitle>
        }
        name="kibanaAdvancedSetting"
        value="kibanaAdvancedSetting"
        checked={isKibanaAdvancedSettingFormElement(indicesFormElement)}
        onChange={changeToKibanaAdvancedSettingType}
        disabled={isReadOnly}
      >
        {isKibanaAdvancedSettingFormElement(indicesFormElement) && (
          <KibanaAdvancedSettingConfigurationPanel />
        )}
      </EuiCheckableCard>
      <EuiSpacer size="m" />
      <EuiCheckableCard
        id="dataView"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.dataViewSectionTitle"
                defaultMessage="Data view (deprecated)"
              />
            </h2>
          </EuiTitle>
        }
        name="dataView"
        value="dataView"
        checked={isDataViewFormElement(indicesFormElement)}
        onChange={changeToIndexPatternType}
        disabled={isReadOnly}
      >
        {isDataViewFormElement(indicesFormElement) && (
          <IndexPatternConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexPatternFormElement={indicesFormElement}
          />
        )}
      </EuiCheckableCard>
      <EuiSpacer size="m" />
      <EuiCheckableCard
        id="indexNames"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.logsIndicesSectionTitle"
                defaultMessage="Indices (deprecated)"
              />
            </h2>
          </EuiTitle>
        }
        name="indexNames"
        value="indexNames"
        checked={isIndexNamesFormElement(indicesFormElement)}
        onChange={changeToIndexNameType}
        disabled={isReadOnly}
        data-test-subj="logIndicesCheckableCard"
      >
        {isIndexNamesFormElement(indicesFormElement) && (
          <IndexNamesConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexNamesFormElement={indicesFormElement}
          />
        )}
      </EuiCheckableCard>
      {numberOfLogsRules > 0 && indicesFormElement.isDirty && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            data-test-subj="infraIndicesPanelSettingsWarningCallout"
            size="m"
            title={i18n.translate('xpack.infra.sourceConfiguration.logsIndicesUsedByRulesTitle', {
              defaultMessage: 'Alerting rules use this data source setting',
            })}
            color="warning"
            iconType="warning"
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logsIndicesUsedByRulesMessage"
              defaultMessage="One or more alerting rules rely on this data source setting. Changing this setting will change which data is used to generate alerts."
            />
            <EuiSpacer size="s" />
            <EuiLink
              data-test-subj="logIndicesViewAffectedRulesLink"
              href={viewAffectedRulesLink}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.logIndices.viewAffectedRulesLink"
                defaultMessage="View affected rules"
              />
            </EuiLink>
          </EuiCallOut>
        </>
      )}
    </EuiFormFieldset>
  );
});

const isDataViewFormElement = isFormElementForType(
  (value): value is LogDataViewReference | undefined =>
    value == null || logDataViewReferenceRT.is(value)
);

const isIndexNamesFormElement = isFormElementForType(logIndexNameReferenceRT.is);

const isKibanaAdvancedSettingFormElement = isFormElementForType(
  logSourcesKibanaAdvancedSettingRT.is
);
