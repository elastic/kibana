/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFieldPassword,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { AwsService } from './ingest_hub/aws_services_data';
import {
  areAllServiceIntegrationConfigsComplete,
  selectedServicesNeedIntegrationParameters,
  type AwsServiceIntegrationConfigValues,
} from './ingest_hub/aws_integration_service_config';
import { AwsOnboardingIntegrationParameters } from './aws_onboarding_integration_parameters';

export interface AwsOnboardingConfigurationValues {
  readonly externalId: string;
  readonly kibanaUrl: string;
  readonly elasticApiToken: string;
  readonly awsRegion: string;
  readonly serviceIntegrationConfig: AwsServiceIntegrationConfigValues;
}

export interface AwsOnboardingConfigurationStepProps {
  readonly catalog: readonly AwsService[];
  readonly selectedServiceIds: ReadonlySet<string>;
  readonly onCanContinueChange: (canContinue: boolean) => void;
  readonly onValuesChange?: (values: AwsOnboardingConfigurationValues) => void;
}

type ElasticConnectionFieldId = 'elasticApiToken' | 'awsRegion';

function generateAwsOnboardingExternalId(): string {
  const suffix = Math.random().toString(36).slice(2, 11);
  return `ela-${suffix}`;
}

function resolveElasticKibanaUrl(basePath: { get: () => string }): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const path = basePath.get();
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  return `${window.location.origin}${normalizedPath}`;
}

function requiredFieldError(fieldLabel: string): string {
  return i18n.translate('xpack.observabilityOnboarding.awsPage.configuration.fieldRequired', {
    defaultMessage: '{fieldLabel} is required.',
    values: { fieldLabel },
  });
}

export const AwsOnboardingConfigurationStep: React.FC<AwsOnboardingConfigurationStepProps> = ({
  catalog,
  selectedServiceIds,
  onCanContinueChange,
  onValuesChange,
}) => {
  const {
    http: { basePath },
  } = useKibana<ObservabilityOnboardingAppServices>().services;

  const [externalId] = useState(() => generateAwsOnboardingExternalId());
  const kibanaUrl = useMemo(() => resolveElasticKibanaUrl(basePath), [basePath]);

  const [elasticApiToken, setElasticApiToken] = useState('');
  const [awsRegion, setAwsRegion] = useState('');
  const [serviceIntegrationConfig, setServiceIntegrationConfig] =
    useState<AwsServiceIntegrationConfigValues>({});
  const [touchedElasticFields, setTouchedElasticFields] = useState<
    ReadonlySet<ElasticConnectionFieldId>
  >(() => new Set());

  const values = useMemo(
    (): AwsOnboardingConfigurationValues => ({
      externalId,
      kibanaUrl,
      elasticApiToken,
      awsRegion,
      serviceIntegrationConfig,
    }),
    [awsRegion, elasticApiToken, externalId, kibanaUrl, serviceIntegrationConfig]
  );

  const markElasticFieldTouched = useCallback((fieldId: ElasticConnectionFieldId) => {
    setTouchedElasticFields((previous) => {
      if (previous.has(fieldId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(fieldId);
      return next;
    });
  }, []);

  const elasticApiTokenLabel = i18n.translate(
    'xpack.observabilityOnboarding.awsPage.configuration.elasticApiTokenLabel',
    {
      defaultMessage: 'Elastic API Token',
    }
  );
  const awsRegionLabel = i18n.translate(
    'xpack.observabilityOnboarding.awsPage.configuration.awsRegionLabel',
    {
      defaultMessage: 'AWS Region',
    }
  );

  const elasticApiTokenError = useMemo(() => {
    if (!touchedElasticFields.has('elasticApiToken') || values.elasticApiToken.trim()) {
      return undefined;
    }
    return requiredFieldError(elasticApiTokenLabel);
  }, [elasticApiTokenLabel, touchedElasticFields, values.elasticApiToken]);

  const awsRegionError = useMemo(() => {
    if (!touchedElasticFields.has('awsRegion') || values.awsRegion.trim()) {
      return undefined;
    }
    return requiredFieldError(awsRegionLabel);
  }, [awsRegionLabel, touchedElasticFields, values.awsRegion]);

  const elasticConnectionComplete = useMemo(
    () =>
      Boolean(values.kibanaUrl.trim()) &&
      Boolean(values.elasticApiToken.trim()) &&
      Boolean(values.awsRegion.trim()),
    [values.awsRegion, values.elasticApiToken, values.kibanaUrl]
  );

  const integrationParametersComplete = useMemo(
    () =>
      areAllServiceIntegrationConfigsComplete({
        serviceIds: selectedServiceIds,
        values: serviceIntegrationConfig,
      }),
    [selectedServiceIds, serviceIntegrationConfig]
  );

  const canContinue = elasticConnectionComplete && integrationParametersComplete;

  useEffect(() => {
    onCanContinueChange(canContinue);
  }, [canContinue, onCanContinueChange]);

  useEffect(() => {
    return () => {
      onCanContinueChange(false);
    };
  }, [onCanContinueChange]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const showIntegrationParameters = selectedServicesNeedIntegrationParameters(selectedServiceIds);

  return (
    <div data-test-subj="awsOnboardingConfigurationStep">
      <EuiForm component="div" fullWidth>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.observabilityOnboarding.awsPage.configuration.externalIdLabel',
            {
              defaultMessage: 'External ID (auto-generated)',
            }
          )}
        >
          <EuiFieldText
            fullWidth
            readOnly
            value={values.externalId}
            data-test-subj="awsOnboardingConfigurationExternalId"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.observabilityOnboarding.awsPage.configuration.kibanaUrlLabel',
            {
              defaultMessage: 'Kibana URL',
            }
          )}
        >
          <EuiFieldText
            fullWidth
            readOnly
            value={values.kibanaUrl}
            data-test-subj="awsOnboardingConfigurationKibanaUrl"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={elasticApiTokenLabel}
          isInvalid={Boolean(elasticApiTokenError)}
          error={elasticApiTokenError}
        >
          <EuiFieldPassword
            fullWidth
            type="dual"
            isInvalid={Boolean(elasticApiTokenError)}
            value={elasticApiToken}
            placeholder={i18n.translate(
              'xpack.observabilityOnboarding.awsPage.configuration.elasticApiTokenPlaceholder',
              {
                defaultMessage: 'Enter API token',
              }
            )}
            onChange={(event) => setElasticApiToken(event.target.value)}
            onBlur={() => markElasticFieldTouched('elasticApiToken')}
            data-test-subj="awsOnboardingConfigurationElasticApiToken"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={awsRegionLabel}
          isInvalid={Boolean(awsRegionError)}
          error={awsRegionError}
        >
          <EuiFieldText
            fullWidth
            isInvalid={Boolean(awsRegionError)}
            value={awsRegion}
            placeholder={i18n.translate(
              'xpack.observabilityOnboarding.awsPage.configuration.awsRegionPlaceholder',
              {
                defaultMessage: 'e.g. us-east-1',
              }
            )}
            onChange={(event) => setAwsRegion(event.target.value)}
            onBlur={() => markElasticFieldTouched('awsRegion')}
            data-test-subj="awsOnboardingConfigurationAwsRegion"
          />
        </EuiFormRow>
      </EuiForm>
      {!showIntegrationParameters ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>
              {i18n.translate('xpack.observabilityOnboarding.awsPage.configuration.prefillHint', {
                defaultMessage:
                  'Elastic pre-filled your deployment URL and external ID. Add an API token with access to ingest AWS data and the primary AWS region for collection.',
              })}
            </p>
          </EuiText>
        </>
      ) : null}
      <AwsOnboardingIntegrationParameters
        catalog={catalog}
        selectedServiceIds={selectedServiceIds}
        values={serviceIntegrationConfig}
        onValuesChange={setServiceIntegrationConfig}
      />
    </div>
  );
};
