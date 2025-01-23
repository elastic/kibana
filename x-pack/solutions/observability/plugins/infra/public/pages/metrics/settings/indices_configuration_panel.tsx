/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import {
  EuiCallOut,
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { METRICS_INDEX_PATTERN } from '../../../../common/constants';
import type { InputFieldProps } from './input_fields';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

interface IndicesConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  metricAliasFieldProps: InputFieldProps;
  metricIndicesExist?: boolean;
  remoteClustersExist?: boolean;
  isMetricAliasChanged?: boolean;
  numberOfInfraRules: number;
}

const METRIC_INDICES_WARNING_TITLE = i18n.translate(
  'xpack.infra.sourceConfiguration.metricIndicesDoNotExistTitle',
  {
    defaultMessage: 'No matching index found',
  }
);

const METRIC_INDICES_NOT_USED_BY_RULES = i18n.translate(
  'xpack.infra.sourceConfiguration.metricIndicesNotUsedByRulesTitle',
  {
    defaultMessage: 'Alerting rules now use data view',
  }
);

const REMOTE_CLUSTER_ERROR_TITLE = i18n.translate(
  'xpack.infra.sourceConfiguration.remoteClusterConnectionDoNotExistTitle',
  {
    defaultMessage: 'Couldn’t connect to the remote cluster',
  }
);

export const IndicesConfigurationPanel = ({
  isLoading,
  readOnly,
  metricAliasFieldProps,
  metricIndicesExist,
  remoteClustersExist,
  isMetricAliasChanged,
  numberOfInfraRules,
}: IndicesConfigurationPanelProps) => {
  const {
    services: { http, spaces },
  } = useKibanaContextForPlugin();

  const [viewDataViewLink, setViewDataViewLink] = useState<string>();

  useEffect(() => {
    const getDataViewLinkWithSpace = async () => {
      const spaceId = spaces ? (await spaces.getActiveSpace()).id : DEFAULT_SPACE_ID;
      const dataViewId = `infra_rules_data_view_${spaceId}`;
      const dataViewLink = http.basePath.prepend(
        `/app/management/kibana/dataViews/dataView/${dataViewId}`
      );
      setViewDataViewLink(dataViewLink);
    };
    getDataViewLinkWithSpace();
  }, [http, spaces]);

  return (
    <EuiForm>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.indicesSectionTitle"
            defaultMessage="Indices"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.metricIndicesTitle"
              defaultMessage="Metrics indices"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesDescription"
            defaultMessage="Index pattern for matching indices that contain metrics data"
          />
        }
      >
        <EuiFormRow
          error={metricAliasFieldProps.error}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.metricIndicesRecommendedValue"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>{METRICS_INDEX_PATTERN}</EuiCode>,
              }}
            />
          }
          isInvalid={metricAliasFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.metricIndicesLabel"
              defaultMessage="Metrics indices"
            />
          }
        >
          <EuiFieldText
            data-test-subj="metricIndicesInput"
            fullWidth
            disabled={isLoading}
            readOnly={readOnly}
            isLoading={isLoading}
            {...metricAliasFieldProps}
          />
        </EuiFormRow>
        {isMetricAliasChanged && numberOfInfraRules > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              data-test-subj="infraIndicesPanelSettingsWarningCalloutNotUsedByRules"
              size="s"
              title={METRIC_INDICES_NOT_USED_BY_RULES}
              color="warning"
              iconType="warning"
            >
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.metricIndicesNotUsedByRulesMessage"
                defaultMessage="If you intend to change data source of the Inventory threshold or Metric threshold rules, please update the data view."
              />
              <EuiSpacer size="s" />
              <EuiLink
                data-test-subj="metricIndicesViewDataViewLink"
                href={viewDataViewLink}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.infra.sourceConfiguration.metricIndices.viewDataViewLink"
                  defaultMessage="View data view"
                />
              </EuiLink>
            </EuiCallOut>
          </>
        )}
        {remoteClustersExist && !metricIndicesExist && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              size="s"
              title={METRIC_INDICES_WARNING_TITLE}
              color="warning"
              iconType="warning"
              data-test-subj="infraIndicesPanelSettingsWarningCallout"
            >
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.metricIndicesDoNotExist"
                defaultMessage="We couldn’t find any metrics data because the pattern entered doesn’t match any index."
              />
            </EuiCallOut>
          </>
        )}
        {!remoteClustersExist && !metricIndicesExist && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              data-test-subj="infraIndicesPanelSettingsDangerCallout"
              size="s"
              title={REMOTE_CLUSTER_ERROR_TITLE}
              color="danger"
              iconType="error"
            >
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.remoteClusterConnectionDoNotExist"
                defaultMessage="Check that the remote cluster is available or that the remote connection settings are
              correct."
              />
            </EuiCallOut>
          </>
        )}
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
