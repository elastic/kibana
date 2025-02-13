/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_ID_REF_NAME } from '../../constants';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import { FieldMigrator } from '../../utils/migrator';

/**
 * A migrator to handle moving specific fields that reference the timeline saved object to the references field within a note saved
 * object.
 */
export const noteFieldsMigrator = new FieldMigrator([
  { path: 'timelineId', type: timelineSavedObjectType, name: TIMELINE_ID_REF_NAME },
]);
