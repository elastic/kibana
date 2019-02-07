/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomRoleSpecification, User } from '../common/types';

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

const allRole: CustomRoleSpecification = {
  name: 'all_role',
  kibana: [
    {
      base: ['all'],
      spaces: ['*'],
    },
  ],
};

interface NoKibanaPrivileges extends User {
  username: 'no_kibana_privileges';
}
const NoKibanaPrivileges: NoKibanaPrivileges = {
  username: 'no_kibana_privileges',
  fullName: 'no_kibana_privileges',
  password: 'no_kibana_privileges-password',
  role: {
    name: 'no_kibana_privileges',
    elasticsearch: {
      indices: [
        {
          names: ['foo'],
          privileges: ['all'],
        },
      ],
    },
  },
};

interface Superuser extends User {
  username: 'superuser';
}
const Superuser: Superuser = {
  username: 'superuser',
  fullName: 'superuser',
  password: 'superuser-password',
  role: {
    name: 'superuser',
  },
};

interface LegacyAll extends User {
  username: 'legacy_all';
}
const LegacyAll: LegacyAll = {
  username: 'legacy_all',
  fullName: 'legacy_all',
  password: 'legacy_all-password',
  role: {
    name: 'legacy_all_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['all'],
        },
      ],
    },
  },
};

interface DualPrivilegesAll extends User {
  username: 'dual_privileges_all';
}
const DualPrivilegesAll: DualPrivilegesAll = {
  username: 'dual_privileges_all',
  fullName: 'dual_privileges_all',
  password: 'dual_privileges_all-password',
  role: {
    name: 'dual_privileges_all_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
  },
};

interface DualPrivilegesRead extends User {
  username: 'dual_privileges_read';
}
const DualPrivilegesRead: DualPrivilegesRead = {
  username: 'dual_privileges_read',
  fullName: 'dual_privileges_read',
  password: 'dual_privileges_read-password',
  role: {
    name: 'dual_privileges_read_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
};

interface All extends User {
  username: 'all';
}
const All: All = {
  username: 'all',
  fullName: 'all',
  password: 'all-password',
  role: allRole,
};

interface ApmUser extends User {
  username: 'apm_user';
}
const ApmUser: ApmUser = {
  username: 'apm_user',
  fullName: 'apm_user',
  password: 'apm_user-password',
  role: {
    name: 'apm_user',
  },
};

interface ApmUserAndAll extends User {
  username: 'apm_user_and_all';
}
const ApmUserAndAll: ApmUserAndAll = {
  username: 'apm_user_and_all',
  fullName: 'apm_user_and_all',
  password: 'apm_user_and_all-password',
  roles: [
    {
      name: 'apm_user',
    },
    allRole,
  ],
};

interface CanvasAll extends User {
  username: 'canvas_all';
}
const CanvasAll: CanvasAll = {
  username: 'canvas_all',
  fullName: 'canvas_all',
  password: 'canvas_all-password',
  role: {
    name: 'canvas_all_role',
    kibana: [
      {
        feature: {
          canvas: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface CanvasRead extends User {
  username: 'canvas_read';
}
const CanvasRead: CanvasRead = {
  username: 'canvas_read',
  fullName: 'canvas_read',
  password: 'canvas_read-password',
  role: {
    name: 'canvas_read_role',
    kibana: [
      {
        feature: {
          canvas: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface DashboardAll extends User {
  username: 'dashboard_all';
}
const DashboardAll: DashboardAll = {
  username: 'dashboard_all',
  fullName: 'dashboard_all',
  password: 'dashboard_all-password',
  role: {
    name: 'dashboard_all_role',
    kibana: [
      {
        feature: {
          dashboard: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface DashboardRead extends User {
  username: 'dashboard_read';
}
const DashboardRead: DashboardRead = {
  username: 'dashboard_read',
  fullName: 'dashboard_read',
  password: 'dashboard_read-password',
  role: {
    name: 'dashboard_read_role',
    kibana: [
      {
        feature: {
          dashboard: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface DevToolsRead extends User {
  username: 'dev_tools_read';
}
const DevToolsRead: DevToolsRead = {
  username: 'dev_tools_read',
  fullName: 'dev_tools_read',
  password: 'dev_tools_read-password',
  role: {
    name: 'dev_tools_read_role',
    kibana: [
      {
        feature: {
          dev_tools: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface DiscoverAll extends User {
  username: 'discover_all';
}
const DiscoverAll: DiscoverAll = {
  username: 'discover_all',
  fullName: 'discover_all',
  password: 'discover_all-password',
  role: {
    name: 'discover_all_role',
    kibana: [
      {
        feature: {
          discover: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface DiscoverRead extends User {
  username: 'discover_read';
}
const DiscoverRead: DiscoverRead = {
  username: 'discover_read',
  fullName: 'discover_read',
  password: 'discover_read-password',
  role: {
    name: 'discover_read_role',
    kibana: [
      {
        feature: {
          discover: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface GraphAll extends User {
  username: 'graph_all';
}
const GraphAll: GraphAll = {
  username: 'graph_all',
  fullName: 'graph_all',
  password: 'graph_all-password',
  role: {
    name: 'graph_all_role',
    kibana: [
      {
        feature: {
          graph: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface GraphRead extends User {
  username: 'graph_read';
}
const GraphRead: GraphRead = {
  username: 'graph_read',
  fullName: 'graph_read',
  password: 'graph_read-password',
  role: {
    name: 'graph_read_role',
    kibana: [
      {
        feature: {
          graph: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface MapsAll extends User {
  username: 'maps_all';
}
const MapsAll: MapsAll = {
  username: 'maps_all',
  fullName: 'maps_all',
  password: 'maps_all-password',
  role: {
    name: 'maps_all_role',
    kibana: [
      {
        feature: {
          maps: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface MapsRead extends User {
  username: 'maps_read';
}
const MapsRead: MapsRead = {
  username: 'maps_read',
  fullName: 'maps_read',
  password: 'maps_read-password',
  role: {
    name: 'maps_read_role',
    kibana: [
      {
        feature: {
          maps: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface InfrastructureRead extends User {
  username: 'infrastructure_read';
}
const InfrastructureRead: InfrastructureRead = {
  username: 'infrastructure_read',
  fullName: 'infrastructure_read',
  password: 'infrastructure_read-password',
  role: {
    name: 'infrastructure_read_role',
    kibana: [
      {
        feature: {
          infrastructure: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface LogsRead extends User {
  username: 'logs_read';
}
const LogsRead: LogsRead = {
  username: 'logs_read',
  fullName: 'logs_read',
  password: 'logs_read-password',
  role: {
    name: 'logs_read_role',
    kibana: [
      {
        feature: {
          logs: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface MachineLearningAdmin extends User {
  username: 'machine_learning_admin';
}
const MachineLearningAdmin: MachineLearningAdmin = {
  username: 'machine_learning_admin',
  fullName: 'machine_learning_admin',
  password: 'machine_learning_admin-password',
  role: {
    name: 'machine_learning_admin',
  },
};

interface MachineLearningAdminAndAll extends User {
  username: 'machine_learning_admin_and_all';
}
const MachineLearningAdminAndAll: MachineLearningAdminAndAll = {
  username: 'machine_learning_admin_and_all',
  fullName: 'machine_learning_admin_and_all',
  password: 'machine_learning_admin_and_all-password',
  roles: [
    {
      name: 'machine_learning_admin',
    },
    allRole,
  ],
};

interface MachineLearningUser extends User {
  username: 'machine_learning_user';
}
const MachineLearningUser: MachineLearningUser = {
  username: 'machine_learning_user',
  fullName: 'machine_learning_user',
  password: 'machine_learning_user-password',
  role: {
    name: 'machine_learning_user',
  },
};

interface MachineLearningUserAndAll extends User {
  username: 'machine_learning_user_and_all';
}
const MachineLearningUserAndAll: MachineLearningUserAndAll = {
  username: 'machine_learning_user_and_all',
  fullName: 'machine_learning_user_and_all',
  password: 'machine_learning_user_and_all-password',
  roles: [
    {
      name: 'machine_learning_user',
    },
    allRole,
  ],
};

interface MonitoringUser extends User {
  username: 'monitoring_user';
}
const MonitoringUser: MonitoringUser = {
  username: 'monitoring_user',
  fullName: 'monitoring_user',
  password: 'monitoring_user-password',
  role: {
    name: 'monitoring_user_role',
  },
};

interface MonitoringUserAndAll extends User {
  username: 'monitoring_user_and_all';
}
const MonitoringUserAndAll: MonitoringUserAndAll = {
  username: 'monitoring_user_and_all',
  fullName: 'monitoring_user_and_all',
  password: 'monitoring_user_and_all-password',
  roles: [
    {
      name: 'monitoring_user',
    },
    allRole,
  ],
};

interface TimelionAll extends User {
  username: 'timelion_all';
}
const TimelionAll: TimelionAll = {
  username: 'timelion_all',
  fullName: 'timelion_all',
  password: 'timelion_all-password',
  role: {
    name: 'timelion_all_role',
    kibana: [
      {
        feature: {
          timelion: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface TimelionRead extends User {
  username: 'timelion_read';
}
const TimelionRead: TimelionRead = {
  username: 'timelion_read',
  fullName: 'timelion_read',
  password: 'timelion_read-password',
  role: {
    name: 'timelion_read_role',
    kibana: [
      {
        feature: {
          timelion: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface UptimeRead extends User {
  username: 'uptime_read';
}
const UptimeRead: UptimeRead = {
  username: 'uptime_read',
  fullName: 'uptime_read',
  password: 'uptime_read-password',
  role: {
    name: 'uptime_read_role',
    kibana: [
      {
        feature: {
          uptime: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface VisualizeAll extends User {
  username: 'visualize_all';
}
const VisualizeAll: VisualizeAll = {
  username: 'visualize_all',
  fullName: 'visualize_all',
  password: 'visualize_all-password',
  role: {
    name: 'visualize_all_role',
    kibana: [
      {
        feature: {
          visualize: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface VisualizeRead extends User {
  username: 'visualize_read';
}
const VisualizeRead: VisualizeRead = {
  username: 'visualize_read',
  fullName: 'visualize_read',
  password: 'visualize_read-password',
  role: {
    name: 'visualize_read_role',
    kibana: [
      {
        feature: {
          visualize: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export type UserScenarios =
  | NoKibanaPrivileges
  | Superuser
  | LegacyAll
  | DualPrivilegesAll
  | DualPrivilegesRead
  | All
  | ApmUser
  | ApmUserAndAll
  | CanvasAll
  | CanvasRead
  | DashboardAll
  | DashboardRead
  | DevToolsRead
  | DiscoverAll
  | DiscoverRead
  | GraphAll
  | GraphRead
  | MapsAll
  | MapsRead
  | InfrastructureRead
  | LogsRead
  | MachineLearningAdmin
  | MachineLearningAdminAndAll
  | MachineLearningUser
  | MachineLearningUserAndAll
  | MonitoringUser
  | MonitoringUserAndAll
  | TimelionAll
  | TimelionRead
  | UptimeRead
  | VisualizeAll
  | VisualizeRead;
export const UserScenarios: UserScenarios[] = [
  NoKibanaPrivileges,
  Superuser,
  LegacyAll,
  DualPrivilegesAll,
  DualPrivilegesRead,
  All,
  ApmUser,
  ApmUserAndAll,
  CanvasAll,
  CanvasRead,
  DashboardAll,
  DashboardRead,
  DevToolsRead,
  DiscoverAll,
  DiscoverRead,
  GraphAll,
  GraphRead,
  MapsAll,
  MapsRead,
  InfrastructureRead,
  LogsRead,
  MachineLearningAdmin,
  MachineLearningAdminAndAll,
  MachineLearningUser,
  MachineLearningUserAndAll,
  MonitoringUser,
  MonitoringUserAndAll,
  TimelionAll,
  TimelionRead,
  UptimeRead,
  VisualizeAll,
  VisualizeRead,
];
