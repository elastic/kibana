/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from '../common/types';

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

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

interface LegacyRead extends User {
  username: 'legacy_read';
}
const LegacyRead: LegacyRead = {
  username: 'legacy_read',
  fullName: 'legacy_read',
  password: 'legacy_read-password',
  role: {
    name: 'legacy_read_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read'],
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
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
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
    kibana: {
      global: {
        minimum: ['read'],
      },
    },
  },
};

interface All extends User {
  username: 'all';
}
const All: All = {
  username: 'all',
  fullName: 'all',
  password: 'all-password',
  role: {
    name: 'all_role',
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
  },
};

interface ApmAll extends User {
  username: 'apm_all';
}
const ApmAll: ApmAll = {
  username: 'apm_all',
  fullName: 'apm_all',
  password: 'apm_all-password',
  role: {
    name: 'apm_all_role',
    kibana: {
      global: {
        feature: {
          apm: ['all'],
        },
      },
    },
  },
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
    kibana: {
      global: {
        feature: {
          canvas: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          canvas: ['read'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          dashboard: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          dashboard: ['read'],
        },
      },
    },
  },
};

interface DevToolsAll extends User {
  username: 'dev_tools_all';
}
const DevToolsAll: DevToolsAll = {
  username: 'dev_tools_all',
  fullName: 'dev_tools_all',
  password: 'dev_tools_all-password',
  role: {
    name: 'dev_tools_all_role',
    kibana: {
      global: {
        feature: {
          dev_tools: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          discover: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          discover: ['read'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          graph: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          graph: ['read'],
        },
      },
    },
  },
};

interface GisAll extends User {
  username: 'gis_all';
}
const GisAll: GisAll = {
  username: 'gis_all',
  fullName: 'gis_all',
  password: 'gis_all-password',
  role: {
    name: 'gis_all_role',
    kibana: {
      global: {
        feature: {
          gis: ['all'],
        },
      },
    },
  },
};

interface GisRead extends User {
  username: 'gis_read';
}
const GisRead: GisRead = {
  username: 'gis_read',
  fullName: 'gis_read',
  password: 'gis_read-password',
  role: {
    name: 'gis_read_role',
    kibana: {
      global: {
        feature: {
          gis: ['read'],
        },
      },
    },
  },
};

interface InfrastructureAll extends User {
  username: 'infrastructure_all';
}
const InfrastructureAll: InfrastructureAll = {
  username: 'infrastructure_all',
  fullName: 'infrastructure_all',
  password: 'infrastructure_all-password',
  role: {
    name: 'infrastructure_all_role',
    kibana: {
      global: {
        feature: {
          infrastructure: ['all'],
        },
      },
    },
  },
};

interface LogsAll extends User {
  username: 'logs_all';
}
const LogsAll: LogsAll = {
  username: 'logs_all',
  fullName: 'logs_all',
  password: 'logs_all-password',
  role: {
    name: 'logs_all_role',
    kibana: {
      global: {
        feature: {
          logs: ['all'],
        },
      },
    },
  },
};

interface MlAll extends User {
  username: 'ml_all';
}
const MlAll: MlAll = {
  username: 'ml_all',
  fullName: 'ml_all',
  password: 'ml_all-password',
  role: {
    name: 'ml_all_role',
    kibana: {
      global: {
        feature: {
          ml: ['all'],
        },
      },
    },
  },
};

interface MonitoringAll extends User {
  username: 'monitoring_all';
}
const MonitoringAll: MonitoringAll = {
  username: 'monitoring_all',
  fullName: 'monitoring_all',
  password: 'monitoring_all-password',
  role: {
    name: 'monitoring_all_role',
    kibana: {
      global: {
        feature: {
          monitoring: ['all'],
        },
      },
    },
  },
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
    kibana: {
      global: {
        feature: {
          timelion: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          timelion: ['read'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          visualize: ['all'],
        },
      },
    },
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
    kibana: {
      global: {
        feature: {
          visualize: ['read'],
        },
      },
    },
  },
};

export type UserScenarios =
  | NoKibanaPrivileges
  | Superuser
  | LegacyAll
  | LegacyRead
  | DualPrivilegesAll
  | DualPrivilegesRead
  | All
  | ApmAll
  | CanvasAll
  | CanvasRead
  | DashboardAll
  | DashboardRead
  | DevToolsAll
  | DiscoverAll
  | DiscoverRead
  | GraphAll
  | GraphRead
  | GisAll
  | GisRead
  | InfrastructureAll
  | LogsAll
  | MonitoringAll
  | MlAll
  | TimelionAll
  | TimelionRead
  | VisualizeAll
  | VisualizeRead;
export const UserScenarios: UserScenarios[] = [
  NoKibanaPrivileges,
  Superuser,
  LegacyAll,
  LegacyRead,
  DualPrivilegesAll,
  DualPrivilegesRead,
  All,
  ApmAll,
  CanvasAll,
  CanvasRead,
  DashboardAll,
  DashboardRead,
  DevToolsAll,
  DiscoverAll,
  DiscoverRead,
  GraphAll,
  GraphRead,
  GisAll,
  GisRead,
  InfrastructureAll,
  LogsAll,
  MonitoringAll,
  MlAll,
  TimelionAll,
  TimelionRead,
  VisualizeAll,
  VisualizeRead,
];
