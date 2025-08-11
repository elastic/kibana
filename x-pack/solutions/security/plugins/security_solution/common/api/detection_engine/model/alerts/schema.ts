/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConvertSchemaType,
  ConvertSchemaTypeToReadSchema,
} from '@kbn/rule-registry-plugin/common/schemas/schema';
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
  ALERT_UPDATED_AT,
  ALERT_UPDATED_BY_USER_ID,
  ALERT_UPDATED_BY_USER_NAME,
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
type Version850 = '8.5.0';
type Version880 = '8.8.0';
type Version890 = '8.9.0';
type Version8120 = '8.12.0';
type Version8130 = '8.13.0';
type Version8160 = '8.16.0';
type Version8180 = '8.18.0';
type Version8190 = '8.19.0';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type AlertAncestorSchema = {
  rule: {
    type: string | undefined;
    version: Version800;
  };
  id: {
    type: string;
    version: Version800;
  };
  type: {
    type: string;
    version: Version800;
  };
  index: {
    type: string;
    version: Version800;
  };
  depth: {
    type: number;
    version: Version800;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DetectionAlertSchema = {
  [TIMESTAMP]: {
    type: string;
    version: Version800;
  };
  [SPACE_IDS]: {
    type: string[];
    version: Version800;
  };
  [EVENT_KIND]: {
    type: 'signal';
    version: Version800;
  };
  [ALERT_ORIGINAL_TIME]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_CONSUMER]: {
    type: string;
    version: Version800;
  };
  [ALERT_ANCESTORS]: {
    type: object[];
    version: Version800;
    fields: AlertAncestorSchema;
  };
  [ALERT_STATUS]: {
    type: string;
    version: Version800;
  };
  [ALERT_WORKFLOW_STATUS]: {
    type: string;
    version: Version800;
  };
  [ALERT_DEPTH]: {
    type: number;
    version: Version800;
  };
  [ALERT_REASON]: {
    type: string;
    version: Version800;
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_SEVERITY]: {
    type: string;
    version: Version800;
  };
  [ALERT_RISK_SCORE]: {
    type: number;
    version: Version800;
  };
  [ALERT_RULE_PARAMETERS]: {
    type: {
      [key: string]: SearchTypes;
    };
    version: Version800;
  };
  [ALERT_RULE_ACTIONS]: {
    type: object[];
    version: Version800;
    fields: {
      action_type_id: {
        type: string;
        version: Version800;
      };
      group?: {
        type: string | undefined;
        version: Version800;
      };
      id: {
        type: string;
        version: Version800;
      };
      params: {
        type: object;
        version: Version800;
      };
      uuid?: {
        type: string | undefined;
        version: Version800;
      };
      alerts_filter?: {
        type: object | undefined;
        version: Version800;
      };
      frequency?: {
        type: object;
        version: Version800;
        fields: {
          summary: {
            type: boolean;
            version: Version800;
          };
          notifyWhen: {
            type: 'onActiveAlert' | 'onThrottleInterval' | 'onActionGroupChange';
            version: Version800;
          };
          throttle: {
            type: string | null;
            version: Version800;
          };
        };
      };
    };
  };
  [ALERT_RULE_AUTHOR]: {
    type: string[];
    version: Version800;
  };
  [ALERT_RULE_CREATED_AT]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_CREATED_BY]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_DESCRIPTION]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_ENABLED]: {
    type: boolean;
    version: Version800;
  };
  [ALERT_RULE_EXCEPTIONS_LIST]: {
    type: object[];
    version: Version800;
    fields: {
      id: {
        type: string;
        version: Version800;
      };
      list_id: {
        type: string;
        version: Version800;
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
        version: Version800;
      };
    };
  };
  [ALERT_RULE_FALSE_POSITIVES]: {
    type: string[];
    version: Version800;
  };
  [ALERT_RULE_FROM]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_IMMUTABLE]: {
    type: boolean;
    version: Version800;
  };
  [ALERT_RULE_INTERVAL]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_LICENSE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_MAX_SIGNALS]: {
    type: number;
    version: Version800;
  };
  [ALERT_RULE_NAME]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_NAMESPACE_FIELD]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_NOTE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_REFERENCES]: {
    type: string[];
    version: Version800;
  };
  [ALERT_RULE_RISK_SCORE_MAPPING]: {
    type: object[];
    version: Version800;
    fields: {
      field: {
        type: string;
        version: Version800;
      };
      value: {
        type: string;
        version: Version800;
      };
      operator: {
        type: 'equals';
        version: Version800;
      };
      risk_score: {
        type: number | undefined;
        version: Version800;
      };
    };
  };
  [ALERT_RULE_RULE_ID]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_RULE_NAME_OVERRIDE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_SEVERITY_MAPPING]: {
    type: object[];
    version: Version800;
    fields: {
      field: {
        type: string;
        version: Version800;
      };
      value: {
        type: string;
        version: Version800;
      };
      operator: {
        type: 'equals';
        version: Version800;
      };
      severity: {
        type: 'low' | 'medium' | 'high' | 'critical';
        version: Version800;
      };
    };
  };
  [ALERT_RULE_TAGS]: {
    type: string[];
    version: Version800;
  };
  [ALERT_RULE_THREAT]: {
    type: object[];
    version: Version800;
    fields: {
      framework: {
        type: string;
        version: Version800;
      };
      tactic: {
        type: object;
        version: Version800;
        fields: {
          id: {
            type: string;
            version: Version800;
          };
          name: {
            type: string;
            version: Version800;
          };
          reference: {
            type: string;
            version: Version800;
          };
        };
      };
      technique?: {
        type: object[];
        version: Version800;
        fields: {
          id: {
            type: string;
            version: Version800;
          };
          name: {
            type: string;
            version: Version800;
          };
          reference: {
            type: string;
            version: Version800;
          };
          subtechnique?: {
            type: object[];
            version: Version800;
            fields: {
              id: {
                type: string;
                version: Version800;
              };
              name: {
                type: string;
                version: Version800;
              };
              reference: {
                type: string;
                version: Version800;
              };
            };
          };
        };
      };
    };
  };
  [ALERT_RULE_THROTTLE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_TIMELINE_ID]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_TIMELINE_TITLE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_TIMESTAMP_OVERRIDE]: {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_RULE_TO]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_TYPE]: {
    type: Type;
    version: Version800;
  };
  [ALERT_RULE_UPDATED_AT]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_UPDATED_BY]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_UUID]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_VERSION]: {
    type: number;
    version: Version800;
  };
  'kibana.alert.rule.risk_score': {
    type: number;
    version: Version800;
  };
  'kibana.alert.rule.severity': {
    type: string;
    version: Version800;
  };
  'kibana.alert.rule.building_block_type': {
    type: string | undefined;
    version: Version800;
  };
  [ALERT_UUID]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_INDICES]: {
    type: string[];
    version: Version840;
  };
  [ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: Version850;
  };
  [ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: Version850;
  };
  [ALERT_USER_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: Version850;
  };
  [ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: Version850;
  };
  [ALERT_URL]: {
    type: string | undefined;
    version: Version880;
  };
  [ALERT_WORKFLOW_TAGS]: {
    type: string[];
    version: Version890;
  };
  [ALERT_WORKFLOW_ASSIGNEE_IDS]: {
    type: string[] | undefined;
    version: Version8120;
  };
  [LEGACY_ALERT_HOST_CRITICALITY]: {
    type: string | undefined;
    version: Version8130;
  };
  [LEGACY_ALERT_USER_CRITICALITY]: {
    type: string | undefined;
    version: Version8130;
  };
  [ALERT_HOST_CRITICALITY]: {
    type: string | undefined;
    version: Version8130;
  };
  [ALERT_USER_CRITICALITY]: {
    type: string | undefined;
    version: Version8130;
  };
  [ALERT_RULE_EXECUTION_TYPE]: {
    type: string;
    version: Version8160;
  };
  [ALERT_INTENDED_TIMESTAMP]: {
    type: string;
    version: Version8160;
  };
  [ALERT_SERVICE_CRITICALITY]: {
    type: string | undefined;
    version: Version8180;
  };
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL]: {
    type: string | undefined;
    version: Version8180;
  };
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM]: {
    type: number | undefined;
    version: Version8180;
  };
  [ALERT_ORIGINAL_DATA_STREAM_DATASET]?: {
    type: string | undefined;
    version: Version8190;
  };
  [ALERT_ORIGINAL_DATA_STREAM_NAMESPACE]?: {
    type: string | undefined;
    version: Version8190;
  };
  [ALERT_ORIGINAL_DATA_STREAM_TYPE]?: {
    type: string | undefined;
    version: Version8190;
  };
  [ALERT_UPDATED_AT]?: {
    type: string | undefined;
    version: Version8190;
  };
  [ALERT_UPDATED_BY_USER_ID]?: {
    type: string | undefined;
    version: Version8190;
  };
  [ALERT_UPDATED_BY_USER_NAME]?: {
    type: string | undefined;
    version: Version8190;
  };
};

export type DetectionAlertRead = ConvertSchemaTypeToReadSchema<Version800, DetectionAlertSchema> & {
  [key: string]: SearchTypes;
};

export type DetectionAlertLatest = ConvertSchemaType<string, DetectionAlertSchema> & {
  [key: string]: SearchTypes;
};

export type DetectionAlert800 = ConvertSchemaType<Version800, DetectionAlertSchema> & {
  [key: string]: SearchTypes;
};

export type AncestorLatest = ConvertSchemaType<string, AlertAncestorSchema>;

export interface WrappedAlert<T> {
  _id: string;
  _index: string;
  _source: T;
}
