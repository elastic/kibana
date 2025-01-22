/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_RULE_EXECUTION_TYPE, ALERT_INTENDED_TIMESTAMP } from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  Ancestor8130,
  BaseFields8130,
  EqlBuildingBlockFields8130,
  EqlShellFields8130,
  NewTermsFields8130,
} from '../8.13.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.12.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.12.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor8130 as Ancestor8160 };

export interface BaseFields8160 extends BaseFields8130 {
  [ALERT_RULE_EXECUTION_TYPE]: string;
  [ALERT_INTENDED_TIMESTAMP]: string;
}

export interface WrappedFields8160<T extends BaseFields8160> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert8160 = AlertWithCommonFields800<BaseFields8160>;

export type EqlShellFields8160 = EqlShellFields8130 & BaseFields8160;

export type EqlBuildingBlockFields8160 = EqlBuildingBlockFields8130 & BaseFields8160;

export type NewTermsFields8160 = NewTermsFields8130 & BaseFields8160;

export type NewTermsAlert8160 = NewTermsFields8130 & BaseFields8160;

export type EqlBuildingBlockAlert8160 = AlertWithCommonFields800<EqlBuildingBlockFields8130>;

export type EqlShellAlert8160 = AlertWithCommonFields800<EqlShellFields8160>;

export type DetectionAlert8160 =
  | GenericAlert8160
  | EqlShellAlert8160
  | EqlBuildingBlockAlert8160
  | NewTermsAlert8160;
