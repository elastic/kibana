/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';

import {
  TEXT_EXPANSION_TYPE,
  TEXT_EXPANSION_FRIENDLY_TYPE,
} from '../../../../../../common/ml_inference_pipeline';

export const MLModelTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === TEXT_EXPANSION_TYPE) {
    return <EuiBadge color="success">{TEXT_EXPANSION_FRIENDLY_TYPE}</EuiBadge>;
  }
  return <EuiBadge color="hollow">{type}</EuiBadge>;
};
