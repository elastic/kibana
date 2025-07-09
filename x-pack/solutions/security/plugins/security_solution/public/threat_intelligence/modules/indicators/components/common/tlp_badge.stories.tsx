/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TLPBadge } from './tlp_badge';

export default {
  component: TLPBadge,
  title: 'TLPBadge',
};

export const Red = {
  args: {
    value: 'RED',
  },
};

export const Amber = {
  args: {
    value: 'AMBER',
  },
};

export const AmberStrict = {
  args: {
    value: 'AMBER+STRICT',
  },
};

export const Green = {
  args: {
    value: 'GREEN',
  },
};

export const White = {
  args: {
    value: 'WHITE',
  },
};

export const Clear = {
  args: {
    value: 'CLEAR',
  },
};

export const Empty = {
  args: {
    value: undefined,
  },
};

export const Other = {
  args: {
    value: 'other',
  },
};
