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

type DatasetQualitySuperUserParams = Pick<DeploymentAgnosticFtrProviderContext, 'getService'> & {
  requestHeaderOptions?: RequestHeadersOptions;
  fallbackRole?: 'admin' | 'editor' | 'viewer';
};

export async function getDatasetQualityAdminSupertestUser({
  getService,
  requestHeaderOptions = {
    useCookieHeader: true,
    withInternalHeaders: true,
  },
  fallbackRole = 'admin',
}: DatasetQualitySuperUserParams): Promise<DatasetQualitySupertestUser> {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const user = await roleScopedSupertest.getSupertestWithRoleScope(
    fallbackRole,
    requestHeaderOptions
  );
  const clean = async () => {
    await user.destroy();
  };

  return { user, isCustomRoleEnabled: true, clean };
}

export async function getDatasetQualityMonitorSupertestUser({
  getService,
  requestHeaderOptions = {
    useCookieHeader: true,
    withInternalHeaders: true,
  },
  fallbackRole = 'editor',
}: DatasetQualitySuperUserParams): Promise<DatasetQualitySupertestUser> {
  const datasetQualityMonitorUserRoleDescriptors: KibanaRoleDescriptors = {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
          privileges: ['read', 'monitor', 'view_index_metadata'],
        },
      ],
    },
    kibana: [],
  };

  return getDatasetQualitySuperTestUserForRoleDescriptors(
    { getService, requestHeaderOptions },
    datasetQualityMonitorUserRoleDescriptors,
    fallbackRole
  );
}

export async function getDatasetQualityReadSupertestUser({
  getService,
  requestHeaderOptions = {
    useCookieHeader: true,
    withInternalHeaders: true,
  },
  fallbackRole = 'viewer',
}: DatasetQualitySuperUserParams): Promise<DatasetQualitySupertestUser> {
  const datasetQualityMonitorUserRoleDescriptors: KibanaRoleDescriptors = {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [],
  };

  return getDatasetQualitySuperTestUserForRoleDescriptors(
    { getService, requestHeaderOptions },
    datasetQualityMonitorUserRoleDescriptors,
    fallbackRole
  );
}

/**
 * Returns a Role Scoped Supertest User corresponding to Dataset Quality User with no privileges.
 * @param getService
 * @param requestHeaderOptions
 * @param fallbackRole
 */
export async function getDatasetQualityNoAccessSuperTestUser({
  getService,
  requestHeaderOptions = {
    useCookieHeader: true,
    withInternalHeaders: true,
  },
  fallbackRole,
}: DatasetQualitySuperUserParams): Promise<DatasetQualitySupertestUser> {
  const noAccessUserRoleDescriptors: KibanaRoleDescriptors = {
    elasticsearch: {
      indices: [],
    },
    kibana: [],
  };

  return getDatasetQualitySuperTestUserForRoleDescriptors(
    { getService, requestHeaderOptions },
    noAccessUserRoleDescriptors,
    fallbackRole
  );
}

/**
 * Returns a Role Scoped Supertest User corresponding to the provided role descriptors.
 *
 * @Note: Falls back to Admin Supertest User if custom role is not available.
 *
 * @param getService { DeploymentAgnosticFtrProviderContext['getService'] } The getService from the FTR Provider Context
 * @param requestHeaderOptions { RequestHeadersOptions } The request header options
 * @param descriptors { KibanaRoleDescriptors } The role descriptors for the custom role
 * @param fallbackRole { 'admin' | 'editor' | 'viewer' } The fallback role if custom role is not available
 * @returns { user: SupertestWithRoleScopeType, isCustomRoleEnabled: boolean, clean: () => Promise<void> } The user,
 * a flag indicating if the custom role is enabled, and a clean function to clean up the user after the test
 */
async function getDatasetQualitySuperTestUserForRoleDescriptors(
  {
    getService,
    requestHeaderOptions = {
      useCookieHeader: true,
      withInternalHeaders: true,
    },
  }: Pick<DatasetQualitySuperUserParams, 'getService' | 'requestHeaderOptions'>,
  descriptors: KibanaRoleDescriptors,
  fallbackRole: DatasetQualitySuperUserParams['fallbackRole'] = 'admin'
): Promise<DatasetQualitySupertestUser> {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const samlAuth = getService('samlAuth');
  const config = getService('config');
  const authRoleProvider = getAuthProvider({ config });
  const isCustomRoleEnabled = authRoleProvider.isCustomRoleEnabled();

  // Fallback to Admin Supertest User if custom role is not available
  // TODO: Remove this fallback once custom role is available in all environments
  if (!isCustomRoleEnabled) {
    const user = await roleScopedSupertest.getSupertestWithRoleScope(
      fallbackRole,
      requestHeaderOptions
    );
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
