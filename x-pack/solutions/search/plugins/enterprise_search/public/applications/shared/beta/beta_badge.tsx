/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';

import { BETA_LABEL } from '../constants';

export const BetaBadge: React.FC = () => {
  return <EuiBadge iconType="beaker">{BETA_LABEL}</EuiBadge>;
};
