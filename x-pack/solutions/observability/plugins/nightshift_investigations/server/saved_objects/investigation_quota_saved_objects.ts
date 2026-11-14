/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { MAX_RUN_LIMIT } from '@kbn/nightshift-shared';
import type {
  InvestigationQuotaGroup,
  InvestigationQuotaSettings,
} from '../../common/investigation_quotas';

export const NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE =
  'nightshift-investigation-quota-settings';
// The limits are deployment-wide, so there is a single settings object.
export const NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID =
  NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE;
export const NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE =
  'nightshift-investigation-quota-ledger';

const DATE_MAX_LENGTH = 10;
const validateInteger = (value: number): string | undefined =>
  Number.isInteger(value) ? undefined : 'Value must be an integer.';

export type NightshiftInvestigationQuotaSettingsAttributes = InvestigationQuotaSettings;

export interface NightshiftInvestigationQuotaLedgerAttributes {
  date: string;
  group: InvestigationQuotaGroup;
  count: number;
}

// `null` is an unlimited limit. A limit of 0 is not valid: it would deny every start.
const limitSchema = schema.nullable(
  schema.number({ min: 1, max: MAX_RUN_LIMIT, validate: validateInteger })
);

export const nightshiftInvestigationQuotaSettingsAttributesSchemaV1 = schema.object({
  enabled: schema.boolean(),
  limits: schema.object({
    automatic_investigation: limitSchema,
    manual_investigation: limitSchema,
    total_investigation: limitSchema,
  }),
});

export const nightshiftInvestigationQuotaSettingsForwardCompatibilitySchemaV1 =
  nightshiftInvestigationQuotaSettingsAttributesSchemaV1.extends({}, { unknowns: 'ignore' });

const ledgerAttributesSchemaV1 = schema.object({
  date: schema.string({ maxLength: DATE_MAX_LENGTH }),
  group: schema.oneOf([
    schema.literal('automatic_investigation'),
    schema.literal('manual_investigation'),
    schema.literal('total_investigation'),
  ]),
  count: schema.number({ min: 0, validate: validateInteger }),
});

export const nightshiftInvestigationQuotaSettingsSavedObjectType: SavedObjectsType<NightshiftInvestigationQuotaSettingsAttributes> =
  {
    name: NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: nightshiftInvestigationQuotaSettingsAttributesSchemaV1,
          forwardCompatibility: nightshiftInvestigationQuotaSettingsForwardCompatibilitySchemaV1,
        },
      },
    },
  };

export const nightshiftInvestigationQuotaLedgerSavedObjectType: SavedObjectsType<NightshiftInvestigationQuotaLedgerAttributes> =
  {
    name: NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: ledgerAttributesSchemaV1,
          forwardCompatibility: ledgerAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  };
