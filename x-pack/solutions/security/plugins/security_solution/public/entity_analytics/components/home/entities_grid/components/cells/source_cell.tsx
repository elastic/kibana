/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EntitySourceValue,
  toEntitySourceArray,
} from '../../../../../../flyout/entity_details/shared/components/entity_source_value';

export const SourceCell = memo(({ value }: { value: unknown }) => (
  <EntitySourceValue values={toEntitySourceArray(value)} textSize="s" />
));
SourceCell.displayName = 'SourceCell';
