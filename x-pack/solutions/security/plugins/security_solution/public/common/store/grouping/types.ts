/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GroupModel {
  activeGroups: string[];
  options: Array<{ key: string; label: string }>;
}

export interface Groups {
  [tableId: string]: GroupModel;
}

export interface GroupState {
  groups: Groups;
}
