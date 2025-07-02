/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_UPDATED_AT,
  ALERT_UPDATED_BY_USER_ID,
  ALERT_UPDATED_BY_USER_NAME,
} from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  Ancestor8180,
  BaseFields8180,
  EqlBuildingBlockFields8180,
  EqlShellFields8180,
  NewTermsFields8180,
} from '../8.18.0';
import type {
  ALERT_ORIGINAL_DATA_STREAM_DATASET,
  ALERT_ORIGINAL_DATA_STREAM_NAMESPACE,
  ALERT_ORIGINAL_DATA_STREAM_TYPE,
} from '../../../../../field_maps/field_names';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.19.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.19.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor8180 as Ancestor8190 };

export interface BaseFields8190 extends BaseFields8180 {
  [ALERT_ORIGINAL_DATA_STREAM_DATASET]?: string;
  [ALERT_ORIGINAL_DATA_STREAM_NAMESPACE]?: string;
  [ALERT_ORIGINAL_DATA_STREAM_TYPE]?: string;
  [ALERT_UPDATED_AT]?: string;
  [ALERT_UPDATED_BY_USER_ID]?: string;
  [ALERT_UPDATED_BY_USER_NAME]?: string;
}

export interface WrappedFields8190<T extends BaseFields8190> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert8190 = AlertWithCommonFields800<BaseFields8190>;

export type EqlShellFields8190 = EqlShellFields8180 & BaseFields8190;

export type EqlBuildingBlockFields8190 = EqlBuildingBlockFields8180 & BaseFields8190;

export type NewTermsFields8190 = NewTermsFields8180 & BaseFields8190;

export type NewTermsAlert8190 = NewTermsFields8180 & BaseFields8190;

export type EqlBuildingBlockAlert8190 = AlertWithCommonFields800<EqlBuildingBlockFields8190>;

export type EqlShellAlert8190 = AlertWithCommonFields800<EqlShellFields8190>;

export type DetectionAlert8190 =
  | GenericAlert8190
  | EqlShellAlert8190
  | EqlBuildingBlockAlert8190
  | NewTermsAlert8190;
