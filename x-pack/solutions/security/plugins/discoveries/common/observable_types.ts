/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Observable type keys for `observable_entities` on attack discoveries.
 *
 * These mirror the Cases built-in observable type keys
 * (`x-pack/platform/plugins/shared/cases/common/constants/observables.ts`).
 * They are intentionally duplicated as local constants (not imported from the
 * cases plugin) to avoid a cross-plugin dependency for the POC.
 */
export const OBSERVABLE_TYPE_IPV4 = 'observable-type-ipv4' as const;
export const OBSERVABLE_TYPE_IPV6 = 'observable-type-ipv6' as const;
export const OBSERVABLE_TYPE_HOSTNAME = 'observable-type-hostname' as const;
export const OBSERVABLE_TYPE_FILE_HASH = 'observable-type-file-hash' as const;
export const OBSERVABLE_TYPE_FILE_PATH = 'observable-type-file-path' as const;
export const OBSERVABLE_TYPE_DOMAIN = 'observable-type-domain' as const;
export const OBSERVABLE_TYPE_AGENT_ID = 'observable-type-agent-id' as const;

/**
 * POC-local observable types with no Cases equivalent (yet): user names and
 * service names that did not match an Entity Store entity.
 */
export const OBSERVABLE_TYPE_USER_NAME = 'observable-type-user-name' as const;
export const OBSERVABLE_TYPE_SERVICE_NAME = 'observable-type-service-name' as const;
