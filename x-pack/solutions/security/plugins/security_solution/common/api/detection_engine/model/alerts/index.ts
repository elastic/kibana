/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionAlert800 } from './8.0.0';

import type { DetectionAlert840 } from './8.4.0';
import type { DetectionAlert860 } from './8.6.0';
import type { DetectionAlert870 } from './8.7.0';
import type { DetectionAlert880 } from './8.8.0';
import type { DetectionAlert890 } from './8.9.0';
import type { DetectionAlert8120 } from './8.12.0';
import type { DetectionAlert8130 } from './8.13.0';
import type { DetectionAlert8160 } from './8.16.0';
import type { DetectionAlert8180 } from './8.18.0';

import type {
  Ancestor8190,
  BaseFields8190,
  DetectionAlert8190,
  EqlBuildingBlockFields8190,
  EqlShellFields8190,
  NewTermsFields8190,
  WrappedFields8190,
} from './8.19.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880
  | DetectionAlert890
  | DetectionAlert8120
  | DetectionAlert8130
  | DetectionAlert8160
  | DetectionAlert8180
  | DetectionAlert8190;

export type {
  Ancestor8190 as AncestorLatest,
  BaseFields8190 as BaseFieldsLatest,
  DetectionAlert8190 as DetectionAlertLatest,
  WrappedFields8190 as WrappedFieldsLatest,
  EqlBuildingBlockFields8190 as EqlBuildingBlockFieldsLatest,
  EqlShellFields8190 as EqlShellFieldsLatest,
  NewTermsFields8190 as NewTermsFieldsLatest,
};

type ModelVersion1 = 1;
type ModelVersion2 = 2 | ModelVersion1;
type ModelVersion3 = 3 | ModelVersion2;

type SchemaString = {
  type: string;
  version: number;
};

type SchemaObject = {
  type: object;
  version: number;
  fields: SchemaType;
};

type SchemaType = Record<string, SchemaString | SchemaObject>;

type AlertSchema = {
  '@timestamp': {
    type: string;
    version: 1;
  };
  newField: {
    type: string;
    version: 2;
  };
  newFieldWithSubfields: {
    type: object;
    version: 3;
    fields: {
      subfield: {
        type: string;
        version: 3;
      }
    }
  };
}

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

type Converter<ModelVersion extends number, schema extends SchemaType> = {
  [k in keyof schema as schema[k]['version'] extends ModelVersion
    ? k
    : never]: schema[k] extends SchemaObject ? Expand<Converter<ModelVersion, schema[k]['fields']>> : schema[k]['type'];
}

type Alert<ModelVersion extends number> = Converter<ModelVersion, AlertSchema>;

type test = Alert<ModelVersion1>;
type test2 = Alert<ModelVersion2>;
type test5 = Alert<ModelVersion3>;

interface AlertSchema2 {
  1: {
    '@timestamp': string;
    newField: string;
  };
  2: {
    newField2: number;
  };
}

type Alert2<ModelVersion extends number> = {
  [k in keyof AlertSchema2[1] as 1 extends ModelVersion ? k : never]: AlertSchema2[1][k];
  [k in keyof AlertSchema2[2] as 2 extends ModelVersion ? k : never]: AlertSchema2[2][k];
};

type test3 = Alert2<ModelVersion1>;
type test4 = Alert2<ModelVersion2>;
