/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { EditPrivateLocationAttributes } from '../../../../../../server/routes/settings/private_locations/edit_private_location';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import type { NewLocation } from './add_or_edit_location_flyout';

export const getPrivateLocationEditPayload = (
  formData: NewLocation,
  existing: PrivateLocation
): EditPrivateLocationAttributes | null => {
  const isLabelChanged = formData.label !== existing.label;
  const areTagsChanged = !isEqual(formData.tags, existing.tags);
  const isAgentShardingChanged =
    Boolean(formData.isAgentSharding) !== Boolean(existing.isAgentSharding);

  if (!isLabelChanged && !areTagsChanged && !isAgentShardingChanged) {
    return null;
  }

  return {
    label: formData.label,
    tags: formData.tags,
    ...(isAgentShardingChanged ? { isAgentSharding: Boolean(formData.isAgentSharding) } : {}),
  };
};
