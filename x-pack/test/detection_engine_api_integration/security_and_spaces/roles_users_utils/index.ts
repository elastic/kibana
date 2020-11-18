/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t1AnalystUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/t1_analyst/detections_user.json';
import * as t2AnalystUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/t2_analyst/detections_user.json';
import * as hunterUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/hunter/detections_user.json';
import * as ruleAuthorUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/rule_author/detections_user.json';
import * as socManagerUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/soc_manager/detections_user.json';
import * as platformEngineerUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/platform_engineer/detections_user.json';
import * as detectionsAdminUser from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/detections_admin/detections_user.json';

import * as t1AnalystRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/t1_analyst/detections_role.json';
import * as t2AnalystRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/t2_analyst/detections_role.json';
import * as hunterRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/hunter/detections_role.json';
import * as ruleAuthorRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/rule_author/detections_role.json';
import * as socManagerRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/soc_manager/detections_role.json';
import * as platformEngineerRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/platform_engineer/detections_role.json';
import * as detectionsAdminRole from '../../../../plugins/security_solution/server/lib/detection_engine/scripts/roles_users/detections_admin/detections_role.json';

import { ROLES } from '../../../../plugins/security_solution/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export const createUserAndRole = async (
  securityService: ReturnType<FtrProviderContext['getService']>,
  role: keyof typeof ROLES
) => {
  switch (role) {
    case ROLES.detections_admin:
      await postRoleAndUser(
        ROLES.detections_admin,
        detectionsAdminRole,
        detectionsAdminUser,
        securityService
      );
      break;
    case ROLES.t1_analyst:
      await postRoleAndUser(ROLES.t1_analyst, t1AnalystRole, t1AnalystUser, securityService);
      break;
    case ROLES.t2_analyst:
      await postRoleAndUser(ROLES.t2_analyst, t2AnalystRole, t2AnalystUser, securityService);
      break;
    case ROLES.hunter:
      await postRoleAndUser(ROLES.hunter, hunterRole, hunterUser, securityService);
      break;
    case ROLES.rule_author:
      await postRoleAndUser(ROLES.rule_author, ruleAuthorRole, ruleAuthorUser, securityService);
      break;
    case ROLES.soc_manager:
      await postRoleAndUser(ROLES.soc_manager, socManagerRole, socManagerUser, securityService);
      break;
    case ROLES.platform_engineer:
      await postRoleAndUser(
        ROLES.platform_engineer,
        platformEngineerRole,
        platformEngineerUser,
        securityService
      );
      break;
    default:
      break;
  }
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
  securityService: ReturnType<FtrProviderContext['getService']>
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
