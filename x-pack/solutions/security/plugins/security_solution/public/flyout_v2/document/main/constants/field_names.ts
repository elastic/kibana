/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PROCESS = 'process';
export const PROCESS_ENTITY_ID = `${PROCESS}.entity_id`;
export const PROCESS_COMMAND_LINE = `${PROCESS}.command_line`;

const ENTRY_LEADER = `${PROCESS}.entry_leader`;
export const ENTRY_LEADER_ENTITY_ID = `${ENTRY_LEADER}.entity_id`;
export const ENTRY_LEADER_START = `${ENTRY_LEADER}.start`;
export const ENTRY_LEADER_USER_NAME = `${ENTRY_LEADER}.user.name`;
export const ENTRY_LEADER_USER_ID = `${ENTRY_LEADER}.user.id`;
export const ENTRY_LEADER_NAME = `${ENTRY_LEADER}.name`;

const GROUP_LEADER = `${PROCESS}.group_leader`;
export const GROUP_LEADER_WORKING_DIRECTORY = `${GROUP_LEADER}.working_directory`;

export const ANCESTOR_INDEX = 'kibana.alert.ancestors.index';
