/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRoleDescriptors } from '@kbn/ftr-common-functional-services';
import { getAuthProvider } from '@kbn/ftr-common-functional-services/services/saml_auth/get_auth_provider';
import { RequestHeadersOptions } from '../../../../services/role_scoped_supertest';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../../services';

export interface DatasetQualitySupertestUser {
  user: SupertestWithRoleScopeType;
  isCustomRoleEnabled: boolean;
  clean: () => Promise<void>;
}

/**
 * Returns a Role Scoped Supertest User corresponding to Dataset Quality Monitor User privileges.
 *
 * @Note: Falls back to Admin Supertest User if custom role is not available.
 *
 * @param getService { DeploymentAgnosticFtrProviderContext['getService'] } The getService from the FTR Provider Context
 * @param requestHeaderOptions { RequestHeadersOptions } The request header options
 * @returns { user: SupertestWithRoleScopeType, clean: () => Promise<void> } The user and a clean function to clean up
 * the user after the test
 */
export async function getDatasetQualityMonitorSupertestUser({
  getService,
  requestHeaderOptions = {
    useCookieHeader: true,
    withInternalHeaders: true,
  },
}: DeploymentAgnosticFtrProviderContext & {
  userOptions?: RequestHeadersOptions;
}): DatasetQualitySupertestUser {
  const datasetQualityMonitorUserRoleDescriptors: KibanaRoleDescriptors = {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
          privileges: ['monitor', 'view_index_metadata'],
        },
      ],
    },
  };

  return getDatasetQualitySuperTestUserForRoleDescriptors(
    { getService, requestHeaderOptions },
    datasetQualityMonitorUserRoleDescriptors
  );
}

/**
 * Returns a Role Scoped Supertest User corresponding to Dataset Quality User with no privileges.
 * @param getService
 * @param requestHeaderOptions
 */
export async function getDatasetQualityNoAccessSuperTestUser({
  getService,
  requestHeaderOptions = {
    useCookieHeader: true,
    withInternalHeaders: true,
  },
}: DeploymentAgnosticFtrProviderContext & {
  userOptions?: RequestHeadersOptions;
}): DatasetQualitySupertestUser {
  const noAccessUserRoleDescriptors: KibanaRoleDescriptors = {
    elasticsearch: {
      indices: [],
    },
  };

  return getDatasetQualitySuperTestUserForRoleDescriptors(
    { getService, requestHeaderOptions },
    noAccessUserRoleDescriptors
  );
}

async function getDatasetQualitySuperTestUserForRoleDescriptors(
  {
    getService,
    requestHeaderOptions = {
      useCookieHeader: true,
      withInternalHeaders: true,
    },
  }: DeploymentAgnosticFtrProviderContext & { userOptions?: RequestHeadersOptions },
  descriptors: KibanaRoleDescriptors
): DatasetQualitySupertestUser {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const samlAuth = getService('samlAuth');
  const config = getService('config');
  const authRoleProvider = getAuthProvider({ config });
  const isCustomRoleEnabled = authRoleProvider.isCustomRoleEnabled();

  // Fallback to Admin Supertest User if custom role is not available
  // TODO: Remove this fallback once custom role is available in all environments
  if (!isCustomRoleEnabled) {
    const user = await roleScopedSupertest.getSupertestWithRoleScope('admin', requestHeaderOptions);
    const clean = async () => {
      await user.destroy();
    };

    return { user, isCustomRoleEnabled: false, clean };
  }

  // Define the custom role for the Dataset Quality Monitor User
  await samlAuth.setCustomRole(descriptors);
  const user = await roleScopedSupertest.getSupertestWithRoleScope(
    samlAuth.getCustomRole(),
    requestHeaderOptions
  );
  const clean = async () => {
    await user.destroy();
    await samlAuth.deleteCustomRole();
  };

  return { user, isCustomRoleEnabled: true, clean };
}
