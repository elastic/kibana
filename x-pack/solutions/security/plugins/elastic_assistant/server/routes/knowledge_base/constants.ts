/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_LABS_RESOURCE = 'security_labs';
export const USER_RESOURCE = 'user';
// Query for determining if Security Labs docs have been loaded. Intended for use with Telemetry
export const SECURITY_LABS_LOADED_QUERY = 'What is Elastic Security Labs';

export const DEFEND_INSIGHTS_RESOURCE = 'defend_insights';
export const DEFEND_INSIGHTS_RESOURCES = `${DEFEND_INSIGHTS_RESOURCE}:`;
export const DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE = `${DEFEND_INSIGHTS_RESOURCE}:policy_response_failure`;
// Query for determining if Defend Insights docs have been loaded
export const DEFEND_INSIGHTS_LOADED_QUERY = 'What are defend insights knowledge base entries';
