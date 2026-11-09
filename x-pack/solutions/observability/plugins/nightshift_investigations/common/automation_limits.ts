/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_RULE_NAMES = 100;
export const MAX_ALERT_SOURCES = 20;
export const MAX_ALERT_SOURCE_LENGTH = 64;
export type AlertSourceMode = 'include' | 'exclude';
export const CLASSIC_ALERT_SOURCE = 'classic';
export const UNIVERSAL_ALERT_SOURCE = 'internal';
export const EXTERNAL_ALERT_SOURCE = 'external';
// Leave room in the investigation message for trigger context, including Slack message text.
export const MAX_AUTOMATION_INSTRUCTIONS_LENGTH = 5000;
