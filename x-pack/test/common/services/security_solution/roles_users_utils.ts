/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../plugins/security_solution/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  t1AnalystUser,
  t2AnalystUser,
  hunterUser,
  hunterNoActionsUser,
  ruleAuthorUser,
  socManagerUser,
  platformEngineerUser,
  detectionsAdminUser,
  readerUser,
  t1AnalystRole,
  t2AnalystRole,
  hunterRole,
  hunterNoActionsRole,
  ruleAuthorRole,
  socManagerRole,
  platformEngineerRole,
  detectionsAdminRole,
  readerRole,
} from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users';

import { ROLES } from '../../../../plugins/security_solution/common/test';

export { ROLES };

/**
 * creates a security solution centric role and a user (both having the same name)
 * @param getService
 * @param role
 */
export const createUserAndRole = async (
  getService: FtrProviderContext['getService'],
  role: ROLES
): Promise<void> => {
  switch (role) {
    case ROLES.detections_admin:
      return postRoleAndUser(
        ROLES.detections_admin,
        detectionsAdminRole,
        detectionsAdminUser,
        getService
      );
    case ROLES.t1_analyst:
      return postRoleAndUser(ROLES.t1_analyst, t1AnalystRole, t1AnalystUser, getService);
    case ROLES.t2_analyst:
      return postRoleAndUser(ROLES.t2_analyst, t2AnalystRole, t2AnalystUser, getService);
    case ROLES.hunter:
      return postRoleAndUser(ROLES.hunter, hunterRole, hunterUser, getService);
    case ROLES.hunter_no_actions:
      return postRoleAndUser(
        ROLES.hunter_no_actions,
        hunterNoActionsRole,
        hunterNoActionsUser,
        getService
      );
    case ROLES.rule_author:
      return postRoleAndUser(ROLES.rule_author, ruleAuthorRole, ruleAuthorUser, getService);
    case ROLES.soc_manager:
      return postRoleAndUser(ROLES.soc_manager, socManagerRole, socManagerUser, getService);
    case ROLES.platform_engineer:
      return postRoleAndUser(
        ROLES.platform_engineer,
        platformEngineerRole,
        platformEngineerUser,
        getService
      );
    case ROLES.reader:
      return postRoleAndUser(ROLES.reader, readerRole, readerUser, getService);
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
  getService: FtrProviderContext['getService'],
  roleName: ROLES
): Promise<void> => {
  const securityService = getService('security');
  await securityService.user.delete(roleName);
  await securityService.role.delete(roleName);
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
      actions?: string[];
      builtInAlerts: string[];
    };
    spaces: string[];
  }>;
}

export const postRoleAndUser = async (
  roleName: string,
  role: RoleInterface,
  user: UserInterface,
  getService: FtrProviderContext['getService']
): Promise<void> => {
  const securityService = getService('security');
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
