/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  LEGACY_ALERT_HOST_CRITICALITY,
  LEGACY_ALERT_USER_CRITICALITY,
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM,
} from '../../../../../field_maps/field_names';
import type {
  Ancestor8120,
  BaseFields8120,
  EqlBuildingBlockFields8120,
  EqlShellFields8120,
  NewTermsFields8120,
} from '../8.12.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.13.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.13.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor8120 as Ancestor8130 };

export interface BaseFields8130 extends BaseFields8120 {
  [LEGACY_ALERT_HOST_CRITICALITY]: string | undefined;
  [LEGACY_ALERT_USER_CRITICALITY]: string | undefined;
  [ALERT_HOST_CRITICALITY]: string | undefined;
  [ALERT_USER_CRITICALITY]: string | undefined;
  /**
   * Risk scores fields was added aroung 8.5.0, but the fields were not added to the alert schema
   */
  [ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL]: string | undefined;
  [ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM]: number | undefined;
  [ALERT_USER_RISK_SCORE_CALCULATED_LEVEL]: string | undefined;
  [ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM]: number | undefined;
}

export interface WrappedFields8130<T extends BaseFields8130> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert8130 = AlertWithCommonFields800<BaseFields8130>;

export type EqlShellFields8130 = EqlShellFields8120 & BaseFields8130;

export type EqlBuildingBlockFields8130 = EqlBuildingBlockFields8120 & BaseFields8130;

export type NewTermsFields8130 = NewTermsFields8120 & BaseFields8130;

export type NewTermsAlert8130 = NewTermsFields8120 & BaseFields8130;

export type EqlBuildingBlockAlert8130 = AlertWithCommonFields800<EqlBuildingBlockFields8120>;

export type EqlShellAlert8130 = AlertWithCommonFields800<EqlShellFields8130>;

export type DetectionAlert8130 =
  | GenericAlert8130
  | EqlShellAlert8130
  | EqlBuildingBlockAlert8130
  | NewTermsAlert8130;
