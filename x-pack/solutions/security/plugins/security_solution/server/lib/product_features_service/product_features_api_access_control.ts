/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled, HttpServiceSetup, RouteAuthz } from '@kbn/core/server';
import { API_ACTION_PREFIX } from '@kbn/security-solution-features/actions';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features/keys';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { ProductFeaturesService } from './product_features_service';

// The `securitySolutionProductFeature:` prefix is used for ProductFeature based control.
// Should be used only by routes that do not need RBAC, only direct productFeature control.
const APP_FEATURE_TAG_PREFIX = 'securitySolutionProductFeature:';

const isAuthzEnabled = (authz?: RecursiveReadonly<RouteAuthz>): authz is AuthzEnabled => {
  return Boolean((authz as AuthzEnabled)?.requiredPrivileges);
};

/**
 * Registers a route access control to ensure that the product features are enabled for the route.
 * Specially required for superuser (`*`) roles with universal access to all APIs.
 * This control checks two things:
 * - `securitySolutionProductFeature:` tag: verifies if the corresponding product feature is enabled.
 * - `requiredPrivileges` in the route's authz config: checks if the required privileges are enabled.
 */
export const registerApiAccessControl = (
  service: ProductFeaturesService,
  http: HttpServiceSetup
) => {
  /** Returns true only if the API privilege is a security action and is disabled */
  const isApiPrivilegeSecurityAndDisabled = (apiPrivilege: string): boolean => {
    if (apiPrivilege.startsWith(API_ACTION_PREFIX)) {
      return !service.isActionRegistered(`api:${apiPrivilege}`);
    }
    return false;
  };

  http.registerOnPostAuth((request, response, toolkit) => {
    for (const tag of request.route.options.tags ?? []) {
      let isEnabled = true;
      if (tag.startsWith(APP_FEATURE_TAG_PREFIX)) {
        isEnabled = service.isEnabled(
          tag.substring(APP_FEATURE_TAG_PREFIX.length) as ProductFeatureKeyType
        );
      }

      if (!isEnabled) {
        service.logger.warn(
          `Accessing disabled route "${request.url.pathname}${request.url.search}": responding with 404`
        );
        return response.notFound();
      }
    }

    // This control ensures the action privileges have been registered by the productFeature service,
    // preventing full access (`*`) roles, such as superuser, from bypassing productFeature controls.
    const authz = request.route.options.security?.authz;
    if (isAuthzEnabled(authz)) {
      const disabled = authz.requiredPrivileges.some((privilegeEntry) => {
        if (typeof privilegeEntry === 'object') {
          if (privilegeEntry.allRequired) {
            if (
              privilegeEntry.allRequired.some((entry) =>
                typeof entry === 'string'
                  ? isApiPrivilegeSecurityAndDisabled(entry)
                  : entry.anyOf.every(isApiPrivilegeSecurityAndDisabled)
              )
            ) {
              return true;
            }
          }
          if (privilegeEntry.anyRequired) {
            if (
              privilegeEntry.anyRequired.every((entry) =>
                typeof entry === 'string'
                  ? isApiPrivilegeSecurityAndDisabled(entry)
                  : entry.allOf.some(isApiPrivilegeSecurityAndDisabled)
              )
            ) {
              return true;
            }
          }
          return false;
        } else {
          return isApiPrivilegeSecurityAndDisabled(privilegeEntry);
        }
      });
      if (disabled) {
        service.logger.warn(
          `Accessing disabled route "${request.url.pathname}${request.url.search}": responding with 404`
        );
        return response.notFound();
      }
    }

    return toolkit.next();
  });
};
