/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Privilege lists enforced by Entity Store install / maintainers-init
 * (`AssetManagerClient.getPrivileges` → `enforceEntityStorePrivileges`)
 */

export const ENTITY_STORE_SOURCE_INDICES_PRIVILEGES = ['read', 'view_index_metadata'];
export const ENTITY_STORE_TARGET_INDICES_PRIVILEGES = ['read', 'manage'];
// Install creates index templates + component templates (manage_index_templates) and the
// latest/metadata ingest pipelines (manage_ingest_pipelines). Both are enforced as the
// requesting user, so both must be part of the enable-store privilege check.
export const ENTITY_STORE_CLUSTER_PRIVILEGES = [
  'manage_index_templates',
  'manage_ingest_pipelines',
];

/**
 * Saved object type registered for Entity Store engines. Install/stop privilege checks use
 * create on this type (`security.authz.actions.savedObject.get(type, 'create')`).
 */
export const ENGINE_DESCRIPTOR_TYPE_NAME = 'entity-engine-descriptor-v2';

/**
 * Kibana privilege string for creating/updating engine descriptors. Matches the shape produced
 * by `actions.savedObject.get(ENGINE_DESCRIPTOR_TYPE_NAME, 'create')` and returned under
 * `install_privileges.kibana` from check_privileges.
 */
export const ENGINE_DESCRIPTOR_CREATE_PRIVILEGE =
  `saved_object:${ENGINE_DESCRIPTOR_TYPE_NAME}/create` as const;
