/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from 'packages/kbn-test/types/ftr';
import { assertUnreachable } from '../../../../plugins/security_solution/common/utility_types';
import {
  t1AnalystUser,
  t2AnalystUser,
  hunterUser,
  ruleAuthorUser,
  socManagerUser,
  platformEngineerUser,
  detectionsAdminUser,
  readerUser,
  t1AnalystRole,
  t2AnalystRole,
  hunterRole,
  ruleAuthorRole,
  socManagerRole,
  platformEngineerRole,
  detectionsAdminRole,
  readerRole,
} from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users';

import { ROLES } from '../../../../plugins/security_solution/common/test';
import { services } from '../../common/services';

export const createUserAndRole = async (
  securityService: ProvidedType<typeof services['security']>,
  role: ROLES
): Promise<void> => {
  switch (role) {
    case ROLES.detections_admin:
      return postRoleAndUser(
        ROLES.detections_admin,
        detectionsAdminRole,
        detectionsAdminUser,
        securityService
      );
    case ROLES.t1_analyst:
      return postRoleAndUser(ROLES.t1_analyst, t1AnalystRole, t1AnalystUser, securityService);
    case ROLES.t2_analyst:
      return postRoleAndUser(ROLES.t2_analyst, t2AnalystRole, t2AnalystUser, securityService);
    case ROLES.hunter:
      return postRoleAndUser(ROLES.hunter, hunterRole, hunterUser, securityService);
    case ROLES.rule_author:
      return postRoleAndUser(ROLES.rule_author, ruleAuthorRole, ruleAuthorUser, securityService);
    case ROLES.soc_manager:
      return postRoleAndUser(ROLES.soc_manager, socManagerRole, socManagerUser, securityService);
    case ROLES.platform_engineer:
      return postRoleAndUser(
        ROLES.platform_engineer,
        platformEngineerRole,
        platformEngineerUser,
        securityService
      );
    case ROLES.reader:
      return postRoleAndUser(ROLES.reader, readerRole, readerUser, securityService);
    default:
      return assertUnreachable(role);
  }
};

/**
 * Given a roleName and security service this will delete the roleName
 * and user
 * @param roleName The user and role to delete with the same name
 * @param securityService The security service
 */
export const deleteUserAndRole = async (
  securityService: ProvidedType<typeof services['security']>,
  roleName: ROLES
) => {
  await securityService.role.delete(roleName);
  await securityService.user.delete(roleName);
};

interface UserInterface {
  password: string;
  roles: string[];
  full_name: string;
  email: string;
}

interface RoleInterface {
  elasticsearch: {
    cluster: string[];
    indices: Array<{
      names: string[];
      privileges: string[];
    }>;
  };
  kibana: Array<{
    feature: {
      ml: string[];
      siem: string[];
      actions: string[];
      builtInAlerts: string[];
      savedObjectsManagement: string[];
    };
    spaces: string[];
  }>;
}

export const postRoleAndUser = async (
  roleName: string,
  role: RoleInterface,
  user: UserInterface,
  securityService: ProvidedType<typeof services['security']>
) => {
  await securityService.role.create(roleName, {
    kibana: role.kibana,
    elasticsearch: role.elasticsearch,
  });
  await securityService.user.create(roleName, {
    password: 'changeme',
    full_name: user.full_name,
    roles: user.roles,
  });
};
