/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';

const withSecurityPrivileges = (privileges: string[], spaces: string[] = ['*']): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [SECURITY_FEATURE_ID]: privileges }, spaces }],
});

/**
 * Base Security `read` plus exactly one Endpoint sub-feature privilege, which is what makes the
 * navigation matrix meaningful: anything visible beyond that area is over-granting.
 */
export const getSingleAreaRole = (privilegePrefix: string, access: 'read' | 'all'): KibanaRole =>
  withSecurityPrivileges(['read', `${privilegePrefix}${access}`]);

/**
 * The Security base privilege only. Endpoint sub-features set `excludeFromBasePrivileges`, so this
 * role reaches no management area despite being `all`.
 */
export const getBasePrivilegeOnlyRole = (): KibanaRole => withSecurityPrivileges(['all']);

/**
 * Space-scoped role used by the privilege summary test: customised Endpoint sub-feature privileges
 * confined to a single space.
 */
export const getSpaceScopedEndpointRole = (spaceId: string): KibanaRole =>
  withSecurityPrivileges(['minimal_all', 'endpoint_list_all', 'host_isolation_all'], [spaceId]);
