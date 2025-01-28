/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawIndicatorFieldId } from '../../common/types/indicator';
import { threatIndicatorNamesOriginScript, threatIndicatorNamesScript } from './indicator_name';

/**
 * Prepare `runtime_mappings` used within TI search
 */
export const createRuntimeMappings = () => ({
  [RawIndicatorFieldId.Name]: {
    type: 'keyword',
    script: {
      source: threatIndicatorNamesScript(),
    },
  },
  [RawIndicatorFieldId.NameOrigin]: {
    type: 'keyword',
    script: {
      source: threatIndicatorNamesOriginScript(),
    },
  },
});
