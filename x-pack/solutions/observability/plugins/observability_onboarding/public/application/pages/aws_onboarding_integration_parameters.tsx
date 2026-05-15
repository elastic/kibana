/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AwsService } from './ingest_hub/aws_services_data';
import {
  getIntegrationConfigFieldError,
  getIntegrationConfigFieldsForService,
  getRequireOneOfGroupError,
  getServiceRequireOneOfGroups,
  isRequireOneOfGroupSatisfied,
  selectedServicesNeedIntegrationParameters,
  type AwsServiceIntegrationConfigField,
  type AwsServiceIntegrationConfigValues,
} from './ingest_hub/aws_integration_service_config';

export interface AwsOnboardingIntegrationParametersProps {
  readonly catalog: readonly AwsService[];
  readonly selectedServiceIds: ReadonlySet<string>;
  readonly values: AwsServiceIntegrationConfigValues;
  readonly onValuesChange: (values: AwsServiceIntegrationConfigValues) => void;
}

const AwsOnboardingServiceLogo: React.FC<{
  readonly src: string;
  readonly alt: string;
  readonly size?: number;
}> = ({ src, alt, size = 28 }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }}
      />
    </div>
  );
};

function integrationParameterTouchedKey(serviceId: string, fieldKey: string): string {
  return `${serviceId}:${fieldKey}`;
}

const AwsOnboardingServiceIntegrationParameters: React.FC<{
  readonly service: AwsService;
  readonly fields: readonly AwsServiceIntegrationConfigField[];
  readonly values: Readonly<Record<string, string>>;
  readonly touchedKeys: ReadonlySet<string>;
  readonly onFieldChange: (fieldKey: string, value: string) => void;
  readonly onFieldBlur: (fieldKey: string) => void;
}> = ({ service, fields, values, touchedKeys, onFieldChange, onFieldBlur }) => {
  const requireOneOfGroups = useMemo(() => getServiceRequireOneOfGroups(service.id), [service.id]);

  const requireOneOfGroupForField = useCallback(
    (fieldKey: AwsServiceIntegrationConfigField['key']) =>
      requireOneOfGroups.find((group) => (group as readonly string[]).includes(fieldKey)),
    [requireOneOfGroups]
  );

  const requiredFields = useMemo(() => fields.filter((field) => field.required), [fields]);

  const getFieldError = useCallback(
    (field: AwsServiceIntegrationConfigField): string | undefined => {
      const touched = touchedKeys.has(integrationParameterTouchedKey(service.id, field.key));
      if (!touched) {
        return undefined;
      }

      const requiredError = getIntegrationConfigFieldError(field, values[field.key]);
      if (requiredError) {
        return requiredError;
      }

      const oneOfGroup = requireOneOfGroupForField(field.key);
      if (oneOfGroup && !isRequireOneOfGroupSatisfied(oneOfGroup, values)) {
        const groupTouched = oneOfGroup.some((inputId) =>
          touchedKeys.has(integrationParameterTouchedKey(service.id, inputId))
        );
        if (groupTouched) {
          return getRequireOneOfGroupError(service.id, oneOfGroup);
        }
      }

      return undefined;
    },
    [requireOneOfGroupForField, service.id, touchedKeys, values]
  );

  const renderField = (field: AwsServiceIntegrationConfigField) => {
    const error = getFieldError(field);
    return (
      <React.Fragment key={field.key}>
        <EuiFormRow
          fullWidth
          label={field.label}
          isInvalid={Boolean(error)}
          error={error}
          data-test-subj={`awsOnboardingIntegrationParameterRow-${service.id}-${field.key}`}
        >
          <EuiFieldText
            fullWidth
            isInvalid={Boolean(error)}
            value={values[field.key] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => onFieldChange(field.key, event.target.value)}
            onBlur={() => onFieldBlur(field.key)}
            data-test-subj={`awsOnboardingIntegrationParameterInput-${service.id}-${field.key}`}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  };

  return (
    <div data-test-subj={`awsOnboardingIntegrationParametersService-${service.id}`}>
      {requiredFields.map((field) => renderField(field))}
      {requireOneOfGroups.map((group) => {
        const groupFields = fields.filter((field) =>
          (group as readonly string[]).includes(field.key)
        );
        if (groupFields.length === 0) {
          return null;
        }

        return (
          <React.Fragment key={group.join('-')}>
            {requiredFields.length > 0 ? <EuiSpacer size="s" /> : null}
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj="awsOnboardingIntegrationParametersRequireOneOfHint"
            >
              <p style={{ margin: 0 }}>
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.integrationParameters.requireOneOfHint',
                  {
                    defaultMessage: 'Provide at least one of the following:',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            {groupFields.map((field) => renderField(field))}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const AwsOnboardingServiceIntegrationAccordion: React.FC<{
  readonly service: AwsService;
  readonly fields: readonly AwsServiceIntegrationConfigField[];
  readonly values: Readonly<Record<string, string>>;
  readonly touchedKeys: ReadonlySet<string>;
  readonly initialIsOpen: boolean;
  readonly onFieldChange: (fieldKey: string, value: string) => void;
  readonly onFieldBlur: (fieldKey: string) => void;
}> = ({ service, fields, values, touchedKeys, initialIsOpen, onFieldChange, onFieldBlur }) => {
  const accordionId = useGeneratedHtmlId({
    prefix: 'awsOnboardingIntegrationParameters',
    suffix: service.id,
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      data-test-subj={`awsOnboardingIntegrationParametersCard-${service.id}`}
      style={{ padding: 16 }}
    >
      <EuiAccordion
        id={accordionId}
        initialIsOpen={initialIsOpen}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <AwsOnboardingServiceLogo src={service.logoUrl} alt={service.name} />
            </EuiFlexItem>
            <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
              <EuiText size="s">
                <strong>{service.name}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <div style={{ paddingTop: 16 }}>
          <AwsOnboardingServiceIntegrationParameters
            service={service}
            fields={fields}
            values={values}
            touchedKeys={touchedKeys}
            onFieldChange={onFieldChange}
            onFieldBlur={onFieldBlur}
          />
        </div>
      </EuiAccordion>
    </EuiPanel>
  );
};

export const AwsOnboardingIntegrationParameters: React.FC<
  AwsOnboardingIntegrationParametersProps
> = ({ catalog, selectedServiceIds, values, onValuesChange }) => {
  const [touchedKeys, setTouchedKeys] = useState<ReadonlySet<string>>(() => new Set());

  const selectedServices = useMemo(() => {
    const byId = new Map(catalog.map((service) => [service.id, service]));
    return [...selectedServiceIds]
      .map((serviceId) => byId.get(serviceId))
      .filter((service): service is AwsService => service !== undefined)
      .filter((service) => getIntegrationConfigFieldsForService(service.id).length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, selectedServiceIds]);

  const showSection = useMemo(
    () => selectedServicesNeedIntegrationParameters(selectedServiceIds),
    [selectedServiceIds]
  );

  const handleFieldChange = useCallback(
    (serviceId: string, fieldKey: string, value: string) => {
      onValuesChange({
        ...values,
        [serviceId]: {
          ...(values[serviceId] ?? {}),
          [fieldKey]: value,
        },
      });
    },
    [onValuesChange, values]
  );

  const handleFieldBlur = useCallback((serviceId: string, fieldKey: string) => {
    const key = integrationParameterTouchedKey(serviceId, fieldKey);
    setTouchedKeys((previous) => {
      if (previous.has(key)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(key);
      return next;
    });
  }, []);

  if (!showSection || selectedServices.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="awsOnboardingIntegrationParameters" style={{ paddingTop: 32 }}>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.observabilityOnboarding.awsPage.integrationParameters.title', {
            defaultMessage: 'Integration Parameters',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p style={{ margin: 0 }}>
          {i18n.translate('xpack.observabilityOnboarding.awsPage.integrationParameters.subtitle', {
            defaultMessage: 'Required settings for the integrations you selected.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      {selectedServices.map((service, index) => {
        const fields = getIntegrationConfigFieldsForService(service.id);
        return (
          <React.Fragment key={service.id}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <AwsOnboardingServiceIntegrationAccordion
              service={service}
              fields={fields}
              values={values[service.id] ?? {}}
              touchedKeys={touchedKeys}
              initialIsOpen={index === 0}
              onFieldChange={(fieldKey, value) => handleFieldChange(service.id, fieldKey, value)}
              onFieldBlur={(fieldKey) => handleFieldBlur(service.id, fieldKey)}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
