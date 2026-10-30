/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { isValidEsqlSourceIndex } from '../../risk_score/validate_esql_source_index';

export const riskEngineConfigurationTypeName = 'risk-engine-configuration';

export const riskEngineConfigurationTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    dataViewId: {
      type: 'keyword',
    },
    /**
     * @deprecated Replaced by Entity Store Maintainer Framework
     */
    enabled: {
      type: 'boolean',
    },
    filter: {
      dynamic: false,
      properties: {},
    },
    identifierType: {
      type: 'keyword',
    },
    /**
     * @deprecated Replaced by Entity Store Maintainer Framework
     */
    interval: {
      type: 'keyword',
    },
    pageSize: {
      type: 'integer',
    },
    alertSampleSizePerShard: {
      type: 'integer',
    },
    enableResetToZero: {
      type: 'boolean',
    },
    range: {
      properties: {
        start: {
          type: 'keyword',
        },
        end: {
          type: 'keyword',
        },
      },
    },
    excludeAlertStatuses: {
      type: 'keyword',
    },
    filters: {
      type: 'nested',
      properties: {
        entity_types: {
          type: 'keyword',
        },
        filter: {
          type: 'text',
        },
      },
    },
  },
};

const version1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        alertSampleSizePerShard: { type: 'integer' },
      },
    },
  ],
};

const version2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        excludeAlertStatuses: { type: 'keyword' },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: (document) => {
        return {
          attributes: {
            ...document.attributes,
            excludeAlertStatuses: document.attributes.excludeAlertStatuses || ['closed'],
          },
        };
      },
    },
  ],
};

const version3: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        enableResetToZero: { type: 'boolean' },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: (document) => {
        return {
          attributes: {
            ...document.attributes,
            enableResetToZero: false,
          },
        };
      },
    },
  ],
};

const version4: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        filters: {
          type: 'nested',
          properties: {
            entity_types: { type: 'keyword' },
            filter: { type: 'text' },
          },
        },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: (document) => {
        return {
          attributes: {
            ...document.attributes,
            filters: document.attributes.filters || [],
          },
        };
      },
    },
  ],
};

// `dataViewId` is resolved to the source index the risk scoring ES|QL reads via
// `FROM ${index}`, which runs as the internal user. The field is writable through the
// generic saved-objects API, so the `create` schema validates it on create/overwrite to
// reject invalid values. `forwardCompatibility` leaves it unvalidated so
// reads of configurations stored before this version never throw (the ES|QL source-index
// validation rejects such values at query time). Every other attribute is left
// unconstrained (`unknowns: 'allow'`) so neither schema rejects a valid configuration.
const buildConfigurationSchema = ({ validateDataViewId }: { validateDataViewId: boolean }) =>
  schema.object(
    {
      dataViewId: schema.maybe(
        schema.string({
          maxLength: 4096,
          ...(validateDataViewId
            ? {
                validate: (value: string) =>
                  isValidEsqlSourceIndex(value) ? undefined : 'must be a valid index expression',
              }
            : {}),
        })
      ),
    },
    { unknowns: 'allow' }
  );

const version5: SavedObjectsModelVersion = {
  changes: [],
  schemas: {
    create: buildConfigurationSchema({ validateDataViewId: true }),
    forwardCompatibility: buildConfigurationSchema({ validateDataViewId: false }),
  },
};

export const riskEngineConfigurationType: SavedObjectsType = {
  name: riskEngineConfigurationTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: riskEngineConfigurationTypeMappings,
  modelVersions: {
    1: version1,
    2: version2,
    3: version3,
    4: version4,
    5: version5,
  },
};
