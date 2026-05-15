/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  AWS_INTEGRATION_INPUT_LABELS,
  getAwsMatrixDeliveryMethodsForService,
  getInputRequirementsForServiceAndDelivery,
  type AwsIntegrationInputId,
  type AwsMatrixDeliveryMethod,
} from './aws_integration_matrix';

/** Integration parameter keys (matrix inputs plus service-specific CloudFormation fields). */
export type AwsServiceIntegrationConfigFieldKey = AwsIntegrationInputId | 'guardduty_detector_id';

export interface AwsServiceIntegrationConfigField {
  readonly key: AwsServiceIntegrationConfigFieldKey;
  readonly label: string;
  readonly placeholder?: string;
  readonly required: boolean;
}

const PRIMARY_DELIVERY_METHOD_ORDER: readonly AwsMatrixDeliveryMethod[] = [
  'agentless',
  'httpjson',
  'cloud_forwarder',
  'firehose',
] as const;

export function getPrimaryDeliveryMethodForService(
  serviceId: string
): AwsMatrixDeliveryMethod | undefined {
  const methods = getAwsMatrixDeliveryMethodsForService(serviceId);
  for (const method of PRIMARY_DELIVERY_METHOD_ORDER) {
    if (methods.some((entry) => entry.method === method)) {
      return method;
    }
  }
  return methods[0]?.method;
}

const SERVICE_INTEGRATION_CONFIG_FIELD_OVERRIDES: Readonly<
  Record<string, readonly AwsServiceIntegrationConfigField[]>
> = {
  guardduty: [
    {
      key: 'guardduty_detector_id',
      label: 'Detector ID',
      placeholder: 'e.g. 6abc123def456...',
      required: true,
    },
    {
      key: 'regions',
      label: 'AWS Region',
      placeholder: 'e.g. us-east-1',
      required: true,
    },
  ],
  inspector: [
    {
      key: 'regions',
      label: 'AWS Region',
      placeholder: 'e.g. us-east-1',
      required: true,
    },
  ],
};

function matrixInputToConfigField(
  serviceId: string,
  inputId: AwsIntegrationInputId,
  required: boolean
): AwsServiceIntegrationConfigField {
  const meta = AWS_INTEGRATION_INPUT_LABELS[inputId];
  const label =
    inputId === 'regions'
      ? 'AWS Region'
      : meta.label.replace(/^AWS /, '').replace(/s$/, '') || meta.label;

  return {
    key: inputId,
    label,
    placeholder: meta.placeholder ?? (inputId === 'regions' ? 'e.g. us-east-1' : undefined),
    required,
  };
}

function deriveIntegrationConfigFieldsFromMatrix(
  serviceId: string
): readonly AwsServiceIntegrationConfigField[] {
  const deliveryMethod = getPrimaryDeliveryMethodForService(serviceId);
  if (!deliveryMethod) {
    return [];
  }

  const requirements = getInputRequirementsForServiceAndDelivery(serviceId, deliveryMethod);
  if (!requirements) {
    return [];
  }

  const fields: AwsServiceIntegrationConfigField[] = requirements.required.map((inputId) =>
    matrixInputToConfigField(serviceId, inputId, true)
  );

  for (const group of requirements.requireOneOf) {
    for (const inputId of group) {
      if (!fields.some((field) => field.key === inputId)) {
        fields.push(matrixInputToConfigField(serviceId, inputId, false));
      }
    }
  }

  return fields;
}

function isRegionsOnlyConfig(fields: readonly AwsServiceIntegrationConfigField[]): boolean {
  return fields.length > 0 && fields.every((field) => field.key === 'regions');
}

/** Fields shown in the Configuration step for one selected service (matrix + overrides). */
export function getIntegrationConfigFieldsForService(
  serviceId: string
): readonly AwsServiceIntegrationConfigField[] {
  const override = SERVICE_INTEGRATION_CONFIG_FIELD_OVERRIDES[serviceId];
  if (override) {
    return override;
  }

  const fields = deriveIntegrationConfigFieldsFromMatrix(serviceId);
  if (isRegionsOnlyConfig(fields)) {
    return [];
  }

  return fields;
}

export function selectedServicesNeedIntegrationParameters(
  serviceIds: ReadonlySet<string>
): boolean {
  for (const serviceId of serviceIds) {
    if (getIntegrationConfigFieldsForService(serviceId).length > 0) {
      return true;
    }
  }
  return false;
}

export type AwsServiceIntegrationConfigValues = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

function isFieldValueValid(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getIntegrationConfigFieldError(
  field: AwsServiceIntegrationConfigField,
  value: string | undefined
): string | undefined {
  if (!field.required || isFieldValueValid(value)) {
    return undefined;
  }

  return i18n.translate(
    'xpack.observabilityOnboarding.awsPage.integrationParameters.fieldRequired',
    {
      defaultMessage: '{fieldLabel} is required.',
      values: { fieldLabel: field.label },
    }
  );
}

export function getServiceRequireOneOfGroups(
  serviceId: string
): readonly (readonly AwsIntegrationInputId[])[] {
  const deliveryMethod = getPrimaryDeliveryMethodForService(serviceId);
  if (!deliveryMethod) {
    return [];
  }

  return getInputRequirementsForServiceAndDelivery(serviceId, deliveryMethod)?.requireOneOf ?? [];
}

export function isRequireOneOfGroupSatisfied(
  group: readonly AwsIntegrationInputId[],
  values: Readonly<Record<string, string>>
): boolean {
  return group.some((inputId) => isFieldValueValid(values[inputId]));
}

export function getRequireOneOfGroupError(
  serviceId: string,
  group: readonly AwsIntegrationInputId[]
): string | undefined {
  if (group.length === 0) {
    return undefined;
  }

  const fields = getIntegrationConfigFieldsForService(serviceId);
  const optionLabels = group.map((inputId) => {
    const field = fields.find((entry) => entry.key === inputId);
    return field?.label ?? AWS_INTEGRATION_INPUT_LABELS[inputId].label;
  });

  return i18n.translate(
    'xpack.observabilityOnboarding.awsPage.integrationParameters.requireOneOf',
    {
      defaultMessage: 'Provide {options}.',
      values: {
        options: new Intl.ListFormat(undefined, { style: 'long', type: 'disjunction' }).format(
          optionLabels
        ),
      },
    }
  );
}

/** Validates one service’s integration parameters (required fields + require-one-of groups). */
export function isServiceIntegrationConfigComplete(
  serviceId: string,
  valuesByField: Readonly<Record<string, string>> | undefined
): boolean {
  const fields = getIntegrationConfigFieldsForService(serviceId);
  if (fields.length === 0) {
    return true;
  }

  const values = valuesByField ?? {};

  if (
    !fields.filter((field) => field.required).every((field) => isFieldValueValid(values[field.key]))
  ) {
    return false;
  }

  const matrixFields = deriveIntegrationConfigFieldsFromMatrix(serviceId);
  const deliveryMethod = getPrimaryDeliveryMethodForService(serviceId);
  if (!deliveryMethod) {
    return true;
  }

  const requirements = getInputRequirementsForServiceAndDelivery(serviceId, deliveryMethod);
  if (!requirements) {
    return true;
  }

  if (isRegionsOnlyConfig(matrixFields)) {
    return true;
  }

  return requirements.requireOneOf.every((group) =>
    group.some((inputId) => isFieldValueValid(values[inputId]))
  );
}

export function areAllServiceIntegrationConfigsComplete(params: {
  readonly serviceIds: ReadonlySet<string>;
  readonly values: AwsServiceIntegrationConfigValues;
}): boolean {
  const { serviceIds, values } = params;
  for (const serviceId of serviceIds) {
    if (!isServiceIntegrationConfigComplete(serviceId, values[serviceId])) {
      return false;
    }
  }
  return true;
}
