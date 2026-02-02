/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityService } from '@kbn/ftr-common-functional-services';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import type { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

interface TestUsers {
  [key: string]: {
    username: string;
    password: string;
    permissions?: any;
  };
}

export const testUsers = {
  fleet_all_int_all: {
    permissions: {
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all_int_all',
    password: 'changeme',
  },
  fleet_all_int_all_default_space_only: {
    permissions: {
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
      },
      spaces: ['default'],
    },
    username: 'fleet_all_int_all_default_space_only',
    password: 'changeme',
  },
  fleet_read_only: {
    permissions: {
      feature: {
        fleetv2: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_read_only',
    password: 'changeme',
  },
  fleet_minimal_all_only: {
    permissions: {
      feature: {
        fleetv2: ['minimal_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_minimal_all_only',
    password: 'changeme',
  },
  fleet_minimal_read_only: {
    permissions: {
      feature: {
        fleetv2: ['minimal_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_minimal_read_only',
    password: 'changeme',
  },
  fleet_agents_read_only: {
    permissions: {
      feature: {
        fleetv2: ['agents_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agents_read_only',
    password: 'changeme',
  },
  fleet_agents_all_only: {
    permissions: {
      feature: {
        fleetv2: ['agents_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agents_all_only',
    password: 'changeme',
  },
  fleet_settings_read_only: {
    permissions: {
      feature: {
        fleetv2: ['settings_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_settings_read_only',
    password: 'changeme',
  },
  fleet_settings_all_only: {
    permissions: {
      feature: {
        fleetv2: ['settings_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_settings_all_only',
    password: 'changeme',
  },
  fleet_agent_policies_read_only: {
    permissions: {
      feature: {
        fleetv2: ['agent_policies_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agent_policies_read_only',
    password: 'changeme',
  },
  fleet_agent_policies_all_only: {
    permissions: {
      feature: {
        fleetv2: ['agent_policies_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agent_policies_all_only',
    password: 'changeme',
  },
  setup: {
    permissions: {
      feature: {
        fleetv2: ['all', 'setup'],
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'setup',
    password: 'changeme',
  },
  fleet_no_access: {
    permissions: {
      feature: {
        dashboards: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_no_access',
    password: 'changeme',
  },
  fleet_all_only: {
    permissions: {
      feature: {
        fleetv2: ['all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all_only',
    password: 'changeme',
  },
  fleet_all_int_read: {
    permissions: {
      feature: {
        fleetv2: ['all'],
        fleet: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all_int_read',
    password: 'changeme',
  },
  integr_all_only: {
    permissions: {
      feature: {
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'integr_all',
    password: 'changeme',
  },

  // --- for package_policy get one, bulk get with ids, get list, integration with Endpoint artifacts ---
  endpoint_integr_read_policy_for_policy_management: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_read', 'policy_management_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_policy_management',
    password: 'changeme',
  },
  endpoint_integr_read_policy_for_trusted_apps: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_read', 'trusted_applications_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_trusted_apps',
    password: 'changeme',
  },
  endpoint_integr_read_policy_for_trusted_devices: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_read', 'trusted_devices_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_trusted_devices',
    password: 'changeme',
  },
  endpoint_integr_read_policy_for_event_filters: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_read', 'event_filters_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_event_filters',
    password: 'changeme',
  },
  endpoint_integr_read_policy_for_host_isolation_exceptions: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_read', 'host_isolation_exceptions_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_host_isolation_exceptions',
    password: 'changeme',
  },
  endpoint_integr_read_policy_for_blocklist: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_read', 'blocklist_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_blocklist',
    password: 'changeme',
  },
  endpoint_integr_read_policy_for_endpoint_exceptions: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_all', 'endpoint_exceptions_read'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_policy_for_endpoint_exceptions',
    password: 'changeme',
  },

  // for package_policy update API
  endpoint_integr_write_policy: {
    permissions: {
      feature: {
        fleet: ['all'],
        [SECURITY_FEATURE_ID]: ['minimal_all', 'policy_management_all'],
        securitySolutionNotes: ['all'],
        securitySolutionTimeline: ['all'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_write_policy',
    password: 'changeme',
  },
  // agent status API
  endpoint_fleet_all_integr_read_policy: {
    permissions: {
      feature: {
        fleet: ['all'],
        [SECURITY_FEATURE_ID]: ['minimal_all', 'policy_management_read'],
        securitySolutionNotes: ['all'],
        securitySolutionTimeline: ['all'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_fleet_all_integr_read_policy',
    password: 'changeme',
  },
  // no access to integrations or policies
  endpoint_fleet_read_integr_none: {
    permissions: {
      feature: {
        fleet: ['read'],
        [SECURITY_FEATURE_ID]: ['minimal_all'],
        securitySolutionNotes: ['all'],
        securitySolutionTimeline: ['all'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_fleet_read_integr_none',
    password: 'changeme',
  },
  // no fleet or integrations but read access to security solution app
  endpoint_integr_read_only_fleet_none: {
    permissions: {
      feature: {
        [SECURITY_FEATURE_ID]: ['minimal_all'],
        securitySolutionNotes: ['all'],
        securitySolutionTimeline: ['all'],
      },
      spaces: ['*'],
    },
    username: 'endpoint_integr_read_only_fleet_none',
    password: 'changeme',
  },
} satisfies TestUsers;

/**
 * Test user group for testing Endpoint artifacts. If a new artifact is added,
 * this group and the API privileges should be updated to provide package policy
 * access for policy-assignment features on the new artifact.
 */
export const endpointIntegrationTestUsers: Record<
  'policy_management' | keyof typeof ENDPOINT_ARTIFACT_LISTS,
  keyof typeof testUsers
> = {
  policy_management: 'endpoint_integr_read_policy_for_policy_management',

  // Endpoint artifact lists
  trustedApps: 'endpoint_integr_read_policy_for_trusted_apps',
  trustedDevices: 'endpoint_integr_read_policy_for_trusted_devices',
  eventFilters: 'endpoint_integr_read_policy_for_event_filters',
  hostIsolationExceptions: 'endpoint_integr_read_policy_for_host_isolation_exceptions',
  blocklists: 'endpoint_integr_read_policy_for_blocklist',
  endpointExceptions: 'endpoint_integr_read_policy_for_endpoint_exceptions',
};

export const setupTestUsers = async (security: SecurityService, spaceAwarenessEnabled = false) => {
  for (const roleName in testUsers) {
    if (!spaceAwarenessEnabled && roleName === 'fleet_all_int_all_default_space_only') {
      continue;
    }
    if (Object.hasOwn(testUsers, roleName)) {
      const user = testUsers[roleName as keyof typeof testUsers];

      if (user.permissions) {
        await security.role.create(roleName, {
          kibana: [user.permissions],
        });
      }

      await security.user.create(user.username, {
        password: user.password,
        roles: [roleName],
        full_name: user.username,
      });
    }
  }
};
