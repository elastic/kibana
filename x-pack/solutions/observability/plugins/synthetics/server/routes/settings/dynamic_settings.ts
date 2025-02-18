/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import { savedObjectsAdapter } from '../../saved_objects';
import { SyntheticsRestApiRouteFactory } from '../types';
import { DynamicSettings } from '../../../common/runtime_types';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const createGetDynamicSettingsRoute: SyntheticsRestApiRouteFactory<
  DynamicSettings
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient }) => {
    const dynamicSettingsAttributes: DynamicSettingsAttributes =
      await savedObjectsAdapter.getSyntheticsDynamicSettings(savedObjectsClient);
    return fromSettingsAttribute(dynamicSettingsAttributes);
  },
});

export const createPostDynamicSettingsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: {
    body: DynamicSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request }): Promise<DynamicSettingsAttributes> => {
    const newSettings = request.body;
    const prevSettings = await savedObjectsAdapter.getSyntheticsDynamicSettings(savedObjectsClient);

    const attr = await savedObjectsAdapter.setSyntheticsDynamicSettings(savedObjectsClient, {
      ...prevSettings,
      ...newSettings,
    } as DynamicSettingsAttributes);

    return fromSettingsAttribute(attr as DynamicSettingsAttributes);
  },
});

export const fromSettingsAttribute = (
  attr: DynamicSettingsAttributes
): DynamicSettingsAttributes => {
  return {
    certExpirationThreshold: attr.certExpirationThreshold,
    certAgeThreshold: attr.certAgeThreshold,
    defaultConnectors: attr.defaultConnectors,
    defaultEmail: attr.defaultEmail,
    defaultStatusRuleEnabled: attr.defaultStatusRuleEnabled ?? true,
    defaultTLSRuleEnabled: attr.defaultTLSRuleEnabled ?? true,
  };
};

export const VALUE_MUST_BE_AN_INTEGER = i18n.translate(
  'xpack.synthetics.settings.invalid.nanError',
  {
    defaultMessage: 'Value must be an integer.',
  }
);

export const validateInteger = (value: number): string | undefined => {
  if (value % 1) {
    return VALUE_MUST_BE_AN_INTEGER;
  }
};

export const DynamicSettingsSchema = schema.object({
  certAgeThreshold: schema.maybe(schema.number({ min: 1, validate: validateInteger })),
  certExpirationThreshold: schema.maybe(schema.number({ min: 1, validate: validateInteger })),
  defaultConnectors: schema.maybe(schema.arrayOf(schema.string())),
  defaultStatusRuleEnabled: schema.maybe(schema.boolean()),
  defaultTLSRuleEnabled: schema.maybe(schema.boolean()),
  defaultEmail: schema.maybe(
    schema.object({
      to: schema.arrayOf(schema.string()),
      cc: schema.maybe(schema.arrayOf(schema.string())),
      bcc: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
});
