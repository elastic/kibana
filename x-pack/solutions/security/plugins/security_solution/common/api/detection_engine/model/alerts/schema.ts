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
// TODO: Create and import 8.0.0 versioned alerting-types schemas
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
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

type Version800 = '8.0.0';
type Version840 = '8.4.0';
type Version860 = '8.6.0';
type Version870 = '8.7.0';
type Version880 = '8.8.0';
type Version890 = '8.9.0';
type Version8120 = '8.12.0';
type Version8130 = '8.13.0';
type Version8160 = '8.16.0';
type Version8180 = '8.18.0';
type Version8190 = '8.19.0';

type Version8190Plus = Version8190;
type Version8180Plus = Version8180 | Version8190Plus;
type Version8160Plus = Version8160 | Version8180Plus;
type Version8130Plus = Version8130 | Version8160Plus;
type Version8120Plus = Version8120 | Version8130Plus;
type Version890Plus = Version890 | Version8120Plus;
type Version880Plus = Version880 | Version890Plus;
type Version870Plus = Version870 | Version880Plus;
type Version860Plus = Version860 | Version870Plus;
type Version840Plus = Version840 | Version860Plus;
type Version800Plus = Version800 | Version840Plus;

type LatestVersion = Version8190;

type AllVersions =
  | Version800
  | Version840
  | Version880
  | Version890
  | Version8120
  | Version8130
  | Version8160
  | Version8180
  | Version8190;

type NodeTypes =
  | SchemaType
  | SchemaType[]
  | object
  | object[]
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;

interface SchemaNode {
  type: NodeTypes;
  version: string;
}

type SchemaType = Record<string, SchemaNode>;

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

/**
 * This forces TS to apply ConvertSchemaType to each ModelVersion when it's a union,
 * e.g. `Version800 | Version840` will return `ConvertSchemaType<Version800, Schema> | ConvertSchemaType<Version840, Schema>`
 *
 * Without this type, `ConvertSchemaType<Version800 | Version840, Schema>` is equivalent to
 * `ConvertSchemaType<Version800, Schema>` because the union type gets treated as a unit rather than distributed -
 * and every field in 8.4.0 is also in 8.0.0 so the `Version840` part would be redundant.
 */
type Distribute<ModelVersion extends string, T extends SchemaType> = ModelVersion extends string
  ? ConvertSchemaType<ModelVersion, T> & { [key: string]: SearchTypes }
  : never;

type ConvertSchemaType<ModelVersion extends string, Schema extends SchemaType> = Expand<{
  // Key remapping via `as` here filters out keys that are not in that schema version,
  // so instead of { key: undefined } the key is completely gone
  // https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
  [k in keyof Schema as ModelVersion extends Required<Schema>[k]['version']
    ? k
    : never]: ConvertSchemaNode<ModelVersion, Required<Schema>[k]['type']>;
}>;

type ConvertSchemaNode<ModelVersion extends string, NodeType extends NodeTypes> = NodeType extends
  | SchemaType
  | SchemaType[]
  ? NodeType extends SchemaType[]
    ? Array<Expand<ConvertSchemaType<ModelVersion, NodeType[0]>>>
    : NodeType extends SchemaType
    ? Expand<ConvertSchemaType<ModelVersion, NodeType>>
    : never
  : NodeType;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type AlertAncestorSchema = {
  rule: {
    type: string | undefined;
    version: Version800Plus;
  };
  id: {
    type: string;
    version: Version800Plus;
  };
  type: {
    type: string;
    version: Version800Plus;
  };
  index: {
    type: string;
    version: Version800Plus;
  };
  depth: {
    type: number;
    version: Version800Plus;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BaseAlertSchema = {
  [TIMESTAMP]: {
    type: string;
    version: Version800Plus;
  };
  [SPACE_IDS]: {
    type: string[];
    version: Version800Plus;
  };
  [EVENT_KIND]: {
    type: 'signal';
    version: Version800Plus;
  };
  [ALERT_ORIGINAL_TIME]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_CONSUMER]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_ANCESTORS]: {
    type: AlertAncestorSchema[];
    version: Version800Plus;
  };
  [ALERT_STATUS]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_WORKFLOW_STATUS]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_DEPTH]: {
    type: number;
    version: Version800Plus;
  };
  [ALERT_REASON]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_SEVERITY]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RISK_SCORE]: {
    type: number;
    version: Version800Plus;
  };
  [ALERT_RULE_PARAMETERS]: {
    type: {
      [key: string]: {
        type: object | object[] | string | string[] | number | boolean | undefined;
        version: Version800Plus;
      };
    };
    version: Version800Plus;
  };
  [ALERT_RULE_ACTIONS]: {
    version: Version800Plus;
    type: Array<{
      action_type_id: {
        type: string;
        version: Version800Plus;
      };
      group?: {
        type: string | undefined;
        version: Version800Plus;
      };
      id: {
        type: string;
        version: Version800Plus;
      };
      params: {
        type: object;
        version: Version800Plus;
      };
      uuid?: {
        type: string | undefined;
        version: Version800Plus;
      };
      alerts_filter?: {
        type: object | undefined;
        version: Version800Plus;
      };
      frequency?: {
        version: Version800Plus;
        type: {
          summary: {
            type: boolean;
            version: Version800Plus;
          };
          notifyWhen: {
            type: 'onActiveAlert' | 'onThrottleInterval' | 'onActionGroupChange';
            version: Version800Plus;
          };
          throttle: {
            type: string | null;
            version: Version800Plus;
          };
        };
      };
    }>;
  };
  [ALERT_RULE_AUTHOR]: {
    type: string[];
    version: Version800Plus;
  };
  [ALERT_RULE_CREATED_AT]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_CREATED_BY]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_DESCRIPTION]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_ENABLED]: {
    type: boolean;
    version: Version800Plus;
  };
  [ALERT_RULE_EXCEPTIONS_LIST]: {
    type: Array<{
      id: {
        type: string;
        version: Version800Plus;
      };
      list_id: {
        type: string;
        version: Version800Plus;
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
        version: Version800Plus;
      };
    }>;
    version: Version800Plus;
  };
  [ALERT_RULE_FALSE_POSITIVES]: {
    type: string[];
    version: Version800Plus;
  };
  [ALERT_RULE_FROM]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_IMMUTABLE]: {
    type: boolean;
    version: Version800Plus;
  };
  [ALERT_RULE_INTERVAL]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_LICENSE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_MAX_SIGNALS]: {
    type: number;
    version: Version800Plus;
  };
  [ALERT_RULE_NAME]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_NAMESPACE_FIELD]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_NOTE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_REFERENCES]: {
    type: string[];
    version: Version800Plus;
  };
  [ALERT_RULE_RISK_SCORE_MAPPING]: {
    type: Array<{
      field: {
        type: string;
        version: Version800Plus;
      };
      value: {
        type: string;
        version: Version800Plus;
      };
      operator: {
        type: 'equals';
        version: Version800Plus;
      };
      risk_score: {
        type: number | undefined;
        version: Version800Plus;
      };
    }>;
    version: Version800Plus;
  };
  [ALERT_RULE_RULE_ID]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_RULE_NAME_OVERRIDE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_SEVERITY_MAPPING]: {
    type: Array<{
      field: {
        type: string;
        version: Version800Plus;
      };
      value: {
        type: string;
        version: Version800Plus;
      };
      operator: {
        type: 'equals';
        version: Version800Plus;
      };
      severity: {
        type: 'low' | 'medium' | 'high' | 'critical';
        version: Version800Plus;
      };
    }>;
    version: Version800Plus;
  };
  [ALERT_RULE_TAGS]: {
    type: string[];
    version: Version800Plus;
  };
  [ALERT_RULE_THREAT]: {
    type: Array<{
      framework: {
        type: string;
        version: Version800Plus;
      };
      tactic: {
        type: {
          id: {
            type: string;
            version: Version800Plus;
          };
          name: {
            type: string;
            version: Version800Plus;
          };
          reference: {
            type: string;
            version: Version800Plus;
          };
        };
        version: Version800Plus;
      };
      technique?: {
        type: Array<{
          id: {
            type: string;
            version: Version800Plus;
          };
          name: {
            type: string;
            version: Version800Plus;
          };
          reference: {
            type: string;
            version: Version800Plus;
          };
          subtechnique?: {
            type: Array<{
              id: {
                type: string;
                version: Version800Plus;
              };
              name: {
                type: string;
                version: Version800Plus;
              };
              reference: {
                type: string;
                version: Version800Plus;
              };
            }>;
            version: Version800Plus;
          };
        }>;
        version: Version800Plus;
      };
    }>;
    version: Version800Plus;
  };
  [ALERT_RULE_THROTTLE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_TIMELINE_ID]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_TIMELINE_TITLE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_TIMESTAMP_OVERRIDE]: {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_TO]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_TYPE]: {
    type: Type;
    version: Version800Plus;
  };
  [ALERT_RULE_UPDATED_AT]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_UPDATED_BY]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_UUID]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_RULE_VERSION]: {
    type: number;
    version: Version800Plus;
  };
  'kibana.alert.rule.risk_score': {
    type: number;
    version: Version800Plus;
  };
  'kibana.alert.rule.severity': {
    type: string;
    version: Version800Plus;
  };
  'kibana.alert.rule.building_block_type': {
    type: string | undefined;
    version: Version800Plus;
  };
  [ALERT_RULE_INDICES]: {
    type: string[];
    version: Version840Plus;
  };
  [ALERT_UUID]: {
    type: string;
    version: Version840Plus;
  };
  [ALERT_URL]: {
    type: string | undefined;
    version: Version880Plus;
  };
  [ALERT_WORKFLOW_TAGS]: {
    type: string[];
    version: Version890Plus;
  };
  [ALERT_WORKFLOW_ASSIGNEE_IDS]: {
    type: string[] | undefined;
    version: Version8120Plus;
  };
  [LEGACY_ALERT_HOST_CRITICALITY]: {
    type: string | undefined;
    version: Version8130Plus;
  };
  [LEGACY_ALERT_USER_CRITICALITY]: {
    type: string | undefined;
    version: Version8130Plus;
  };
  [ALERT_HOST_CRITICALITY]: {
    type: string | undefined;
    version: Version8130Plus;
  };
  [ALERT_USER_CRITICALITY]: {
    type: string | undefined;
    version: Version8130Plus;
  };
  // TODO: risk score fields were actually added earlier, figure out when exactly
  [ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: Version8130Plus;
  };
  [ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: Version8130Plus;
  };
  [ALERT_USER_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: Version8130Plus;
  };
  [ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: Version8130Plus;
  };
  [ALERT_RULE_EXECUTION_TYPE]: {
    type: string;
    version: Version8160Plus;
  };
  [ALERT_INTENDED_TIMESTAMP]: {
    type: string;
    version: Version8160Plus;
  };
  [ALERT_SERVICE_CRITICALITY]: {
    type: string | undefined;
    version: Version8180Plus;
  };
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: Version8180Plus;
  };
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: Version8180Plus;
  };
  [ALERT_ORIGINAL_DATA_STREAM_DATASET]?: {
    type: string | undefined;
    version: Version8190Plus;
  };
  [ALERT_ORIGINAL_DATA_STREAM_NAMESPACE]?: {
    type: string | undefined;
    version: Version8190Plus;
  };
  [ALERT_ORIGINAL_DATA_STREAM_TYPE]?: {
    type: string | undefined;
    version: Version8190Plus;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EqlBuildingBlockAlertFields = {
  [ALERT_GROUP_ID]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_GROUP_INDEX]: {
    type: number;
    version: Version800Plus;
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: 'default';
    version: Version800Plus;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EqlShellAlertFields = {
  [ALERT_GROUP_ID]: {
    type: string;
    version: Version800Plus;
  };
  [ALERT_UUID]: {
    type: string;
    version: Version800Plus;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type NewTermsAlertFields = {
  [ALERT_NEW_TERMS]: {
    type: Array<string | number | null>;
    version: Version840Plus;
  };
};

export type BaseAlert<ModelVersion extends string> = Distribute<ModelVersion, BaseAlertSchema>;
export type EqlBuildingBlockAlert<ModelVersion extends string> = Distribute<
  ModelVersion,
  BaseAlertSchema & EqlBuildingBlockAlertFields
>;
export type EqlShellAlert<ModelVersion extends string> = Distribute<
  ModelVersion,
  BaseAlertSchema & EqlShellAlertFields
>;
export type NewTermsAlert<ModelVersion extends string> = Distribute<
  ModelVersion,
  BaseAlertSchema & NewTermsAlertFields
>;

export type BaseAlertLatest = BaseAlert<LatestVersion>;
export type EqlBuildingBlockAlertLatest = EqlBuildingBlockAlert<LatestVersion>;
export type EqlShellAlertLatest = EqlShellAlert<LatestVersion>;
export type NewTermsAlertLatest = NewTermsAlert<LatestVersion>;

export type AllBaseAlerts = BaseAlert<AllVersions>;
export type AllEqlBuildingBlockAlerts = EqlBuildingBlockAlert<AllVersions>;
export type AllEqlShellAlerts = EqlShellAlert<AllVersions>;
export type AllNewTermsAlerts = NewTermsAlert<AllVersions>;

export type DetectionAlert =
  | (AllBaseAlerts | AllEqlBuildingBlockAlerts | AllEqlShellAlerts | AllNewTermsAlerts) & {
      [key: string]: SearchTypes;
    };

export type AncestorLatest = ConvertSchemaType<LatestVersion, AlertAncestorSchema>;

export interface WrappedAlertLatest<T> {
  _id: string;
  _index: string;
  _source: T;
}
