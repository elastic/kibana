/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defend Workflows API helpers.
 * Use kbnClient from Scout fixtures for setup/teardown.
 *
 * - createEndpointPolicy: Use Fleet API /api/fleet/package_policies (POST)
 * - removeArtifactList: Use /api/exception_lists/items (DELETE) with list_id
 * - SAML auth: Use browserAuth.loginWithCustomRole() for RBAC tests
 */
