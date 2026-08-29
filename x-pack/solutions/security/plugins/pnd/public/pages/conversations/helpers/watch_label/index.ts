/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import * as i18n from '../../translations';

/**
 * Human names for the managed watches, keyed by workflow id.
 *
 * A proposal row carries `workflowId` and nothing friendlier, and the watch
 * projection lives behind a different route — so the queue resolves the name
 * itself rather than adding a second fetch to the page for four words. Kept as a
 * map over the id constants so a renamed watch id fails the type check here.
 */
const LABEL_BY_WORKFLOW_ID: Readonly<Record<string, string>> = {
  [SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID]: i18n.WATCH_ATTACK_DISCOVERY_GENERATION,
  [SYSTEM_SECURITY_WATCH_DARK_ID]: i18n.WATCH_DARK,
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: i18n.WATCH_DEEP,
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: i18n.WATCH_POST_INCIDENT,
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: i18n.WATCH_FLOOR,
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: i18n.WATCH_OFFICER,
};

/**
 * The name of the watch a proposal came from, or the raw workflow id when it is
 * not one of the managed watches.
 *
 * The fallback is the honest answer rather than a guess: a custom watch has no
 * registered display name anywhere in PND, and showing its id is more useful to
 * an approver than "Unknown watch".
 */
export const watchLabel = (workflowId: string): string =>
  LABEL_BY_WORKFLOW_ID[workflowId] ?? workflowId;
