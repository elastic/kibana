/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { GroupModel, GroupState } from './types';

export const groupSelector = ({ groups }: GroupState, id: string): GroupModel => groups[id];
export const groupIdSelector = () => createSelector(groupSelector, (group) => group);
