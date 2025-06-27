/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_INTENDED_TIMESTAMP,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_EXECUTION_TYPE,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
// TODO: Create and import 8.0.0 versioned ListArray schema
import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
// TODO: Create and import 8.0.0 versioned alerting-types schemas
import type {
  RiskScoreMapping,
  SeverityMapping,
  Threats,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_ACTIONS,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
  ALERT_RULE_IMMUTABLE,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_THREAT,
  ALERT_RULE_THROTTLE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
  ALERT_RULE_TIMESTAMP_OVERRIDE,
  ALERT_RULE_INDICES,
  ALERT_NEW_TERMS,
  LEGACY_ALERT_HOST_CRITICALITY,
  LEGACY_ALERT_USER_CRITICALITY,
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_SERVICE_CRITICALITY,
  ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_ORIGINAL_DATA_STREAM_DATASET,
  ALERT_ORIGINAL_DATA_STREAM_NAMESPACE,
  ALERT_ORIGINAL_DATA_STREAM_TYPE,
} from '../../../../field_maps/field_names';
// TODO: Create and import 8.0.0 versioned RuleAlertAction type
import type { SearchTypes } from '../../../../detection_engine/types';
import type { RuleAction } from '../rule_schema';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.0.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.0.0.

If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.

Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export interface Ancestor800 {
  rule: string | undefined;
  id: string;
  type: string;
  index: string;
  depth: number;
}

export interface EqlBuildingBlockFields800 extends BaseFields800 {
  [ALERT_GROUP_ID]: string;
  [ALERT_GROUP_INDEX]: number;
  [ALERT_BUILDING_BLOCK_TYPE]: 'default';
}

export interface EqlShellFields800 extends BaseFields800 {
  [ALERT_GROUP_ID]: string;
  [ALERT_UUID]: string;
}

export type EqlBuildingBlockAlert800 = AlertWithCommonFields800<EqlBuildingBlockFields800>;

export type EqlShellAlert800 = AlertWithCommonFields800<EqlShellFields800>;

export type GenericAlert800 = AlertWithCommonFields800<BaseFields800>;

// This is the type of the final generated alert including base fields, common fields
// added by the alertWithPersistence function, and arbitrary fields copied from source documents
export type DetectionAlert800 = GenericAlert800 | EqlShellAlert800 | EqlBuildingBlockAlert800;

type ModelVersion1 = '8.0.0';
type ModelVersion2 = '8.4.0' | ModelVersion1;
type ModelVersion3 = '8.6.0' | ModelVersion2;

interface SchemaNonObject {
  type: string | string[] | number | boolean | null | undefined;
  version: string;
}

interface SchemaObject {
  type: object | object[] | undefined;
  version: string;
  fields?: SchemaType;
}

type SchemaType = Record<string, SchemaNonObject | SchemaObject>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BaseAlertSchema = {
  [TIMESTAMP]: {
    type: string;
    version: '8.0.0';
  };
  [SPACE_IDS]: {
    type: string[];
    version: '8.0.0';
  };
  [EVENT_KIND]: {
    type: 'signal';
    version: '8.0.0';
  };
  [ALERT_ORIGINAL_TIME]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_CONSUMER]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_ANCESTORS]: {
    type: object[];
    version: '8.0.0';
    fields: {
      rule: {
        type: string | undefined;
        version: '8.0.0';
      };
      id: {
        type: string;
        version: '8.0.0';
      };
      type: {
        type: string;
        version: '8.0.0';
      };
      index: {
        type: string;
        version: '8.0.0';
      };
      depth: {
        type: number;
        version: '8.0.0';
      };
    };
  };
  [ALERT_STATUS]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_WORKFLOW_STATUS]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_DEPTH]: {
    type: number;
    version: '8.0.0';
  };
  [ALERT_REASON]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_SEVERITY]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RISK_SCORE]: {
    type: number;
    version: '8.0.0';
  };
  // TODO: version rule schemas and pull in 8.0.0 versioned rule schema to define alert rule parameters type
  [ALERT_RULE_PARAMETERS]: {
    type: object;
    version: '8.0.0';
    fields: {
      [key: string]:
        | {
            type: string | string[] | number | boolean | undefined;
            version: '8.0.0';
          }
        | {
            type: object | object[];
            version: '8.0.0';
          };
    };
  };
  [ALERT_RULE_ACTIONS]: {
    type: object[];
    version: '8.0.0';
    fields: {
      action_type_id: {
        type: string;
        version: '8.0.0';
      };
      group?: {
        type: string | undefined;
        version: '8.0.0';
      };
      id: {
        type: string;
        version: '8.0.0';
      };
      params: {
        type: object;
        version: '8.0.0';
      };
      uuid?: {
        type: string | undefined;
        version: '8.0.0';
      };
      alerts_filter?: {
        type: object | undefined;
        version: '8.0.0';
      };
      frequency?: {
        type: object | undefined;
        version: '8.0.0';
        fields: {
          summary: {
            type: boolean;
            version: '8.0.0';
          };
          notifyWhen: {
            type: 'onActiveAlert' | 'onThrottleInterval' | 'onActionGroupChange';
            version: '8.0.0';
          };
          throttle: {
            type: string | null;
            version: '8.0.0';
          };
        };
      };
    };
  };
  [ALERT_RULE_AUTHOR]: {
    type: string[];
    version: '8.0.0';
  };
  [ALERT_RULE_CREATED_AT]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_CREATED_BY]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_DESCRIPTION]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_ENABLED]: {
    type: boolean;
    version: '8.0.0';
  };
  [ALERT_RULE_EXCEPTIONS_LIST]: {
    type: object[];
    version: '8.0.0';
    fields: {
      id: {
        type: string;
        version: '8.0.0';
      };
      list_id: {
        type: string;
        version: '8.0.0';
      };
      type: {
        type:
          | 'detection'
          | 'rule_default'
          | 'endpoint'
          | 'endpoint_trusted_apps'
          | 'endpoint_events'
          | 'endpoint_host_isolation_exceptions'
          | 'endpoint_blocklists';
        version: '8.0.0';
      };
    };
  };
  [ALERT_RULE_FALSE_POSITIVES]: {
    type: string[];
    version: '8.0.0';
  };
  [ALERT_RULE_FROM]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_IMMUTABLE]: {
    type: boolean;
    version: '8.0.0';
  };
  [ALERT_RULE_INTERVAL]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_LICENSE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_MAX_SIGNALS]: {
    type: number;
    version: '8.0.0';
  };
  [ALERT_RULE_NAME]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_NAMESPACE_FIELD]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_NOTE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_REFERENCES]: {
    type: string[];
    version: '8.0.0';
  };
  [ALERT_RULE_RISK_SCORE_MAPPING]: {
    type: object[];
    version: '8.0.0';
    fields: {
      field: {
        type: string;
        version: '8.0.0';
      };
      value: {
        type: string;
        version: '8.0.0';
      };
      operator: {
        type: 'equals';
        version: '8.0.0';
      };
      risk_score: {
        type: number | undefined;
        version: '8.0.0';
      };
    };
  };
  [ALERT_RULE_RULE_ID]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_RULE_NAME_OVERRIDE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_SEVERITY_MAPPING]: {
    type: object[];
    version: '8.0.0';
    fields: {
      field: {
        type: string;
        version: '8.0.0';
      };
      value: {
        type: string;
        version: '8.0.0';
      };
      operator: {
        type: 'equals';
        version: '8.0.0';
      };
      severity: {
        type: 'low' | 'medium' | 'high' | 'critical';
        version: '8.0.0';
      };
    };
  };
  [ALERT_RULE_TAGS]: {
    type: string[];
    version: '8.0.0';
  };
  [ALERT_RULE_THREAT]: {
    type: object[];
    version: '8.0.0';
    fields: {
      framework: {
        type: string;
        version: '8.0.0';
      };
      tactic: {
        type: object;
        version: '8.0.0';
        fields: {
          id: {
            type: string;
            version: '8.0.0';
          };
          name: {
            type: string;
            version: '8.0.0';
          };
          reference: {
            type: string;
            version: '8.0.0';
          };
        };
      };
    };
  };
  [ALERT_RULE_THROTTLE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_TIMELINE_ID]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_TIMELINE_TITLE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_TIMESTAMP_OVERRIDE]: {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_TO]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_TYPE]: {
    type: Type;
    version: '8.0.0';
  };
  [ALERT_RULE_UPDATED_AT]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_UPDATED_BY]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_UUID]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_RULE_VERSION]: {
    type: number;
    version: '8.0.0';
  };
  'kibana.alert.rule.risk_score': {
    type: number;
    version: '8.0.0';
  };
  'kibana.alert.rule.severity': {
    type: string;
    version: '8.0.0';
  };
  'kibana.alert.rule.building_block_type': {
    type: string | undefined;
    version: '8.0.0';
  };
  [ALERT_RULE_INDICES]: {
    type: string[];
    version: '8.4.0';
  };
  [ALERT_UUID]: {
    type: string;
    version: '8.4.0';
  };
  [ALERT_URL]: {
    type: string | undefined;
    version: '8.8.0';
  };
  [ALERT_WORKFLOW_TAGS]: {
    type: string[];
    version: '8.9.0';
  };
  [ALERT_WORKFLOW_ASSIGNEE_IDS]: {
    type: string[] | undefined;
    version: '8.12.0';
  };
  [LEGACY_ALERT_HOST_CRITICALITY]: {
    type: string | undefined;
    version: '8.13.0';
  };
  [LEGACY_ALERT_USER_CRITICALITY]: {
    type: string | undefined;
    version: '8.13.0';
  };
  [ALERT_HOST_CRITICALITY]: {
    type: string | undefined;
    version: '8.13.0';
  };
  [ALERT_USER_CRITICALITY]: {
    type: string | undefined;
    version: '8.13.0';
  };
  // TODO: risk score fields were actually added earlier, figure out when exactly
  [ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: '8.13.0';
  };
  [ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: '8.13.0';
  };
  [ALERT_USER_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: '8.13.0';
  };
  [ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: '8.13.0';
  };
  [ALERT_RULE_EXECUTION_TYPE]: {
    type: string;
    version: '8.16.0';
  };
  [ALERT_INTENDED_TIMESTAMP]: {
    type: string;
    version: '8.16.0';
  };
  [ALERT_SERVICE_CRITICALITY]: {
    type: string | undefined;
    version: '8.18.0';
  };
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: '8.18.0';
  };
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: '8.18.0';
  };
  [ALERT_ORIGINAL_DATA_STREAM_DATASET]?: {
    type: string | undefined;
    version: '8.19.0';
  };
  [ALERT_ORIGINAL_DATA_STREAM_NAMESPACE]?: {
    type: string | undefined;
    version: '8.19.0';
  };
  [ALERT_ORIGINAL_DATA_STREAM_TYPE]?: {
    type: string | undefined;
    version: '8.19.0';
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EqlBuildingBlockAlertFields = {
  [ALERT_GROUP_ID]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_GROUP_INDEX]: {
    type: number;
    version: '8.0.0';
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: 'default';
    version: '8.0.0';
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EqlShellAlertFields = {
  [ALERT_GROUP_ID]: {
    type: string;
    version: '8.0.0';
  };
  [ALERT_UUID]: {
    type: string;
    version: '8.0.0';
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type NewTermsAlertFields = {
  [ALERT_NEW_TERMS]: {
    type: Array<string | number | null>;
    version: '8.4.0';
  };
};

/** 
 * This type is a no-op: Expand<T> evaluates to T. Its use is to force VSCode to evaluate type expressions
 * and show the expanded form, e.g.
 * type test5 = {
        "@timestamp": string;
        newField: string;
        newFieldWithSubfields: {
            subfield: string;
        };
    }
 * instead of
 *  type test5 = {
        "@timestamp": string;
        newField: string;
        newFieldWithSubfields: Converter<ModelVersion3, {
            subfield: {
                type: string;
                version: 3;
            };
        }>;
    }
 * */
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type Converter<ModelVersion extends string, Schema extends SchemaType> = Expand<{
  // Key remapping via `as` here filters out keys that are not in that schema version,
  // so instead of { key: undefined } the key is completely gone
  // https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
  [k in keyof Schema as Required<Schema>[k]['version'] extends ModelVersion
    ? k
    : never]: Required<Schema>[k] extends SchemaObject // If the type of the property is object or object[] AND it has subfields defined,
    ? Required<Schema>[k]['fields'] extends SchemaType //  we recursively parse those subfields. Otherwise, we just use the type of the property
      ? undefined extends Required<Schema>[k]['type']
        ? Required<Required<Schema>[k]['type']> extends object[]
          ? Array<Expand<Converter<ModelVersion, Required<Schema>[k]['fields']>>> | undefined
          : Expand<Converter<ModelVersion, Required<Schema>[k]['fields']>> | undefined
        : Required<Required<Schema>[k]['type']> extends object[]
        ? Array<Expand<Converter<ModelVersion, Required<Schema>[k]['fields']>>>
        : Expand<Converter<ModelVersion, Required<Schema>[k]['fields']>>
      : Required<Schema>[k]['type']
    : Required<Schema>[k]['type'];
}>;

type ConvertSchemaFields<
  ModelVersion extends string,
  Schema extends SchemaType
> = Schema extends object[]
  ? Array<Expand<Converter<ModelVersion, Schema>>>
  : Expand<Converter<ModelVersion, Schema>>;

type Converted = Converter2<string, testSchema>;

type CombineSchemas<
  Schema1 extends Record<string, string | string[] | number | boolean | undefined>,
  Schema2 extends Record<string, string | string[] | number | boolean | undefined>
> = {
  [k in keyof Schema1 | keyof Schema2]: k extends keyof Schema2
    ? Schema2[k]
    : k extends keyof Schema1
    ? Schema1[k]
    : never;
};

export type BaseAlert<ModelVersion extends string> = Converter<ModelVersion, BaseAlertSchema>;
export type EqlBuildingBlockAlert<ModelVersion extends string> = Converter<
  ModelVersion,
  BaseAlertSchema
> &
  Converter<ModelVersion, EqlBuildingBlockAlertFields>;
export type EqlShellAlert<ModelVersion extends string> = Converter<ModelVersion, BaseAlertSchema> &
  Converter<ModelVersion, EqlShellAlertFields>;
export type NewTermsAlert<ModelVersion extends string> = Converter<ModelVersion, BaseAlertSchema> &
  Converter<ModelVersion, NewTermsAlertFields>;

export type BaseAlertLatest = BaseAlert<string>;
export type EqlBuildingBlockAlertLatest = EqlBuildingBlockAlert<string>;
export type EqlShellAlertLatest = EqlShellAlert<string>;
export type NewTermsAlertLatest = NewTermsAlert<string>;

const test = (input: BaseAlertLatest) => {
  const aaa = input[ALERT_RULE_ACTIONS];
};

export interface WrappedAlertLatest<T> {
  _id: string;
  _index: string;
  _source: T;
}

const test: EqlBuildingBlockAlert<'8.0.0'> = {};

type Test = BaseAlert<ModelVersion1>;
type Test2 = BaseAlert<ModelVersion2>;
type test5 = BaseAlert<ModelVersion3>;
