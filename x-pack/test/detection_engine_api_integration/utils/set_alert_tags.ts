/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTagIds } from '@kbn/security-solution-plugin/common/detection_engine/schemas/common';
import { SetAlertTagsSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request/set_alert_tags_schema';

export const setAlertTags = ({
  tagsToAdd,
  tagsToRemove,
  ids,
}: {
  tagsToAdd: string[];
  tagsToRemove: string[];
  ids: AlertTagIds;
}): SetAlertTagsSchema => ({
  tags: {
    tags_to_add: tagsToAdd,
    tags_to_remove: tagsToRemove,
  },
  ids,
});
