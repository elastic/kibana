/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { isEqual } from 'lodash';
import { schema } from '@kbn/config-schema';
import {
  getSyntheticsDynamicSettings,
  setSyntheticsDynamicSettings,
} from '../../saved_objects/synthetics_settings';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { DynamicSettings } from '../../../common/runtime_types';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DefaultRuleService } from '../default_alerts/default_alert_service';

export const createGetDynamicSettingsRoute: SyntheticsRestApiRouteFactory<
  DynamicSettings
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient }) => {
    const dynamicSettingsAttributes: DynamicSettingsAttributes = await getSyntheticsDynamicSettings(
      savedObjectsClient
    );

    return fromSettingsAttribute(dynamicSettingsAttributes);
  },
});

export const createPostDynamicSettingsRoute: SyntheticsRestApiRouteFactory<
  DynamicSettings
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: {
    body: DynamicSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ context, savedObjectsClient, request, server }): Promise<DynamicSettings> => {
    const { privateLocationsSyncInterval: _ignoredSyncInterval, ...otherSettings } = request.body;
    const prevSettings = await getSyntheticsDynamicSettings(savedObjectsClient);

    const nextSettings = {
      ...prevSettings,
      ...otherSettings,
    } as DynamicSettingsAttributes;

    // Rules are refreshed before persisting so a failure leaves the previous connectors
    // intact in the stored settings and the save can be retried.
    if (
      !isEqual(prevSettings.defaultConnectors, nextSettings.defaultConnectors) ||
      !isEqual(prevSettings.defaultEmail, nextSettings.defaultEmail)
    ) {
      await new DefaultRuleService(context, server, savedObjectsClient).refreshDefaultRuleActions(
        nextSettings,
        prevSettings.defaultConnectors
      );
    }

    const attr = await setSyntheticsDynamicSettings(savedObjectsClient, nextSettings);

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
  // The sync interval is no longer configurable; older clients may still send it.
  privateLocationsSyncInterval: schema.maybe(schema.number({ max: 1440 })),
});
