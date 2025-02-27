/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  Ancestor8160,
  BaseFields8160,
  EqlBuildingBlockFields8160,
  EqlShellFields8160,
  NewTermsFields8160,
} from '../8.16.0';
import type {
  ALERT_SERVICE_CRITICALITY,
  ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM,
} from '../../../../../field_maps/field_names';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.18.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.18.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor8160 as Ancestor8180 };

export interface BaseFields8180 extends BaseFields8160 {
  [ALERT_SERVICE_CRITICALITY]: string | undefined;
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL]: string | undefined;
  [ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM]: number | undefined;
}

export interface WrappedFields8180<T extends BaseFields8160> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert8180 = AlertWithCommonFields800<BaseFields8180>;

export type EqlShellFields8180 = EqlShellFields8160 & BaseFields8180;

export type EqlBuildingBlockFields8180 = EqlBuildingBlockFields8160 & BaseFields8180;

export type NewTermsFields8180 = NewTermsFields8160 & BaseFields8180;

export type NewTermsAlert8180 = NewTermsFields8160 & BaseFields8180;

export type EqlBuildingBlockAlert8180 = AlertWithCommonFields800<EqlBuildingBlockFields8160>;

export type EqlShellAlert8180 = AlertWithCommonFields800<EqlShellFields8180>;

export type DetectionAlert8180 =
  | GenericAlert8180
  | EqlShellAlert8180
  | EqlBuildingBlockAlert8180
  | NewTermsAlert8180;
