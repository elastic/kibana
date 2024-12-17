/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_URL, ALERT_UUID } from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  Ancestor840,
  BaseFields840,
  EqlBuildingBlockFields840,
  EqlShellFields840,
  NewTermsFields840,
} from '../8.4.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.8.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.8.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor840 as Ancestor880 };
export interface BaseFields880 extends BaseFields840 {
  [ALERT_URL]: string | undefined;
  [ALERT_UUID]: string;
}

export interface WrappedFields880<T extends BaseFields880> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert880 = AlertWithCommonFields800<BaseFields880>;

export type EqlShellFields880 = EqlShellFields840 & BaseFields880;

export type EqlBuildingBlockFields880 = EqlBuildingBlockFields840 & BaseFields880;

export type NewTermsFields880 = NewTermsFields840 & BaseFields880;

export type NewTermsAlert880 = NewTermsFields840 & BaseFields880;

export type EqlBuildingBlockAlert880 = AlertWithCommonFields800<EqlBuildingBlockFields880>;

export type EqlShellAlert880 = AlertWithCommonFields800<EqlShellFields880>;

export type DetectionAlert880 =
  | GenericAlert880
  | EqlShellAlert880
  | EqlBuildingBlockAlert880
  | NewTermsAlert880;
