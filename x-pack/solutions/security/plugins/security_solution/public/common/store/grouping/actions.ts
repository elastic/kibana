/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { TableId } from '@kbn/securitysolution-data-table';

const actionCreator = actionCreatorFactory('x-pack/security_solution/groups');

export const updateGroups = actionCreator<{
  activeGroups?: string[];
  tableId: TableId;
  options?: Array<{ key: string; label: string }>;
}>('UPDATE_GROUPS');
