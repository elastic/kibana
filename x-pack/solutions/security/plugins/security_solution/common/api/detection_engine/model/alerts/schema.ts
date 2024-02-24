/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
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
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
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

type ModelVersion1 = 1;
type ModelVersion2 = 2 | ModelVersion1;
type ModelVersion3 = 3 | ModelVersion2;

interface SchemaNonObject {
  type: string | string[] | number | boolean | undefined;
  version: number;
}

interface SchemaObject {
  type: object | object[] | undefined;
  version: number;
  fields?: SchemaType;
}

type SchemaType = Record<string, SchemaNonObject | SchemaObject>;

type TestSchema = {
  [TIMESTAMP]: {
    1: {
      type: string;
    };
    2: {
      type: number;
    };
  };
};

type TestSchemaType = Record<
  string,
  Record<number, { type: string | string[] | number | boolean | undefined }>
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type AlertSchema = {
  [TIMESTAMP]: {
    type: string;
    version: 1;
  };
  [SPACE_IDS]: {
    type: string[];
    version: 1;
  };
  [EVENT_KIND]: {
    type: 'signal';
    version: 1;
  };
  [ALERT_ORIGINAL_TIME]: {
    type: string | undefined;
    version: 1;
  };
  // When we address https://github.com/elastic/kibana/issues/102395 and change ID generation logic, consider moving
  // ALERT_UUID creation into buildAlert and keep ALERT_UUID with the rest of BaseFields fields. As of 8.2 though,
  // ID generation logic is fragmented and it would be more confusing to put any of it in buildAlert
  // [ALERT_UUID]: string;
  [ALERT_RULE_CONSUMER]: {
    type: string;
    version: 1;
  };
  [ALERT_ANCESTORS]: {
    type: object[];
    version: 1;
    fields: {
      rule: {
        type: string | undefined;
        version: 1;
      };
      id: {
        type: string;
        version: 1;
      };
      type: {
        type: string;
        version: 1;
      };
      index: {
        type: string;
        version: 1;
      };
      depth: {
        type: number;
        version: 1;
      };
    };
  };
  [ALERT_STATUS]: {
    type: string;
    version: 1;
  };
  [ALERT_WORKFLOW_STATUS]: {
    type: string;
    version: 1;
  };
  [ALERT_DEPTH]: {
    type: number;
    version: 1;
  };
  [ALERT_REASON]: {
    type: string;
    version: 1;
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_SEVERITY]: {
    type: string;
    version: 1;
  };
  [ALERT_RISK_SCORE]: {
    type: number;
    version: 1;
  };
  // TODO: version rule schemas and pull in 8.0.0 versioned rule schema to define alert rule parameters type
  [ALERT_RULE_PARAMETERS]: {
    type: object;
    version: 1;
    fields: {
      [key: string]:
        | {
            type: string | string[] | number | undefined;
            version: 1;
          }
        | {
            type: object | object[];
            version: 1;
          };
    };
  };
  [ALERT_RULE_ACTIONS]: {
    type: object[];
    version: 1;
    fields: {
      action_type_id: {
        type: string;
        version: 1;
      };
      group: {
        type: string;
        version: 1;
      };
      id: {
        type: string;
        version: 1;
      };
      params: {
        type: object;
        version: 1;
      };
      uuid: {
        type: string | undefined;
        version: 1;
      };
      alerts_filter: {
        type: object | undefined;
        version: 1;
      };
      frequency: {
        type: object | undefined;
        version: 1;
        fields: {
          summary: {
            type: boolean;
            version: 1;
          };
          notifyWhen: {
            type: 'onActiveAlert' | 'onThrottleInterval' | 'onActionGroupChange';
            version: 1;
          };
          throttle: {
            type: string;
            version: 1;
          };
        };
      };
    };
  };
  [ALERT_RULE_AUTHOR]: {
    type: string[];
    version: 1;
  };
  [ALERT_RULE_CREATED_AT]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_CREATED_BY]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_DESCRIPTION]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_ENABLED]: {
    type: boolean;
    version: 1;
  };
  [ALERT_RULE_EXCEPTIONS_LIST]: {
    type: object[];
    version: 1;
    fields: {
      id: {
        type: string;
        version: 1;
      };
      list_id: {
        type: string;
        version: 1;
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
        version: 1;
      };
    };
  };
  [ALERT_RULE_FALSE_POSITIVES]: {
    type: string[];
    version: 1;
  };
  [ALERT_RULE_FROM]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_IMMUTABLE]: {
    type: boolean;
    version: 1;
  };
  [ALERT_RULE_INTERVAL]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_LICENSE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_MAX_SIGNALS]: {
    type: number;
    version: 1;
  };
  [ALERT_RULE_NAME]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_NAMESPACE_FIELD]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_NOTE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_REFERENCES]: {
    type: string[];
    version: 1;
  };
  [ALERT_RULE_RISK_SCORE_MAPPING]: {
    type: object[];
    version: 1;
    fields: {
      field: {
        type: string;
        version: 1;
      };
      value: {
        type: string;
        version: 1;
      };
      operator: {
        type: 'equals';
        version: 1;
      };
      risk_score: {
        type: number | undefined;
        version: 1;
      };
    };
  };
  [ALERT_RULE_RULE_ID]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_RULE_NAME_OVERRIDE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_SEVERITY_MAPPING]: {
    type: object[];
    version: 1;
    fields: {
      field: {
        type: string;
        version: 1;
      };
      value: {
        type: string;
        version: 1;
      };
      operator: {
        type: 'equals';
        version: 1;
      };
      severity: {
        type: 'low' | 'medium' | 'high' | 'critical';
        version: 1;
      };
    };
  };
  [ALERT_RULE_TAGS]: {
    type: string[];
    version: 1;
  };
  [ALERT_RULE_THREAT]: {
    type: object[];
    version: 1;
    fields: {
      framework: {
        type: string;
        version: 1;
      };
      tactic: {
        type: object;
        version: 1;
        fields: {
          id: {
            type: string;
            version: 1;
          };
          name: {
            type: string;
            version: 1;
          };
          reference: {
            type: string;
            version: 1;
          };
        };
      };
    };
  };
  [ALERT_RULE_THROTTLE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_TIMELINE_ID]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_TIMELINE_TITLE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_TIMESTAMP_OVERRIDE]: {
    type: string | undefined;
    version: 1;
  };
  [ALERT_RULE_TO]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_TYPE]: {
    type: Type;
    version: 1;
  };
  [ALERT_RULE_UPDATED_AT]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_UPDATED_BY]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_UUID]: {
    type: string;
    version: 1;
  };
  [ALERT_RULE_VERSION]: {
    type: number;
    version: 1;
  };
  'kibana.alert.rule.risk_score': {
    type: number;
    version: 1;
  };
  'kibana.alert.rule.severity': {
    type: string;
    version: 1;
  };
  'kibana.alert.rule.building_block_type': {
    type: string | undefined;
    version: 1;
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

type Converter<ModelVersion extends number, Schema extends SchemaType> = {
  // Key remapping via `as` here filters out keys that are not in that schema version,
  // so instead of { key: undefined } the key is completely gone
  // https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
  [k in keyof Schema as Schema[k]['version'] extends ModelVersion
    ? k
    : never]: Schema[k] extends SchemaObject // If the type of the property is object or object[] AND it has subfields defined,
    ? Schema[k]['fields'] extends SchemaType //  we recursively parse those subfields. Otherwise, we just use the type of the property
      ? Schema[k]['type'] extends object[]
        ? Array<Expand<Converter<ModelVersion, Schema[k]['fields']>>>
        : Expand<Converter<ModelVersion, Schema[k]['fields']>>
      : Schema[k]['type']
    : Schema[k]['type'];
};

type TestConverter<ModelVersion extends number, Schema extends TestSchemaType> = {
  [k in keyof Schema as Schema[k][ModelVersion] extends object
    ? k
    : never]: Schema[k][ModelVersion] extends {
    type: string | string[] | number | boolean | undefined;
  }
    ? Schema[k][ModelVersion]['type']
    : never;
};

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

type testTest1 = TestConverter<1, TestSchema>;
type testTest2 = TestConverter<2, TestSchema>;

type testCombined = CombineSchemas<testTest1, testTest2>;

type Alert<ModelVersion extends number> = Converter<ModelVersion, AlertSchema>;

type test = Alert<ModelVersion1>;
type test2 = Alert<ModelVersion2>;
type test5 = Alert<ModelVersion3>;
