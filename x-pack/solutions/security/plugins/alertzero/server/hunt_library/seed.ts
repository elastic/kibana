/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import awsIamCrossAccountAssumeRoleCreation from './definitions/aws_iam_cross_account_assume_role_creation.json';
import linuxGtfobinsExternalConnections from './definitions/linux_gtfobins_external_connections.json';
import linuxUncommonExecSuspiciousDirectory from './definitions/linux_uncommon_exec_suspicious_directory.json';
import oktaFailedOauthPublicClientScope from './definitions/okta_failed_oauth_public_client_scope.json';
import oktaPasswordSprayingRepeatSource from './definitions/okta_password_spraying_repeat_source.json';
import rareCreateremotethreadSourceProcess from './definitions/rare_createremotethread_source_process.json';
import rareLsassProcessAccess from './definitions/rare_lsass_process_access.json';
import rareRundll32CommandLine from './definitions/rare_rundll32_command_line.json';
import { parseHuntDefinition, type HuntDefinition } from './hunt_definition';

/**
 * The checked-in, read-only POC hunts. They are generated from a pinned TRADE revision and
 * reviewed; see `scripts/hunt_library`. Parsing at load fails fast on a malformed definition.
 */
export const HUNT_DEFINITIONS: readonly HuntDefinition[] = Object.freeze(
  [
    rareLsassProcessAccess,
    rareCreateremotethreadSourceProcess,
    rareRundll32CommandLine,
    linuxGtfobinsExternalConnections,
    linuxUncommonExecSuspiciousDirectory,
    oktaFailedOauthPublicClientScope,
    oktaPasswordSprayingRepeatSource,
    awsIamCrossAccountAssumeRoleCreation,
  ].map((definition) => parseHuntDefinition(definition))
);

export const getHuntDefinition = (id: string): HuntDefinition | undefined =>
  HUNT_DEFINITIONS.find((definition) => definition.id === id);
