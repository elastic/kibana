/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Features } from '../common/features';
import { Space } from '../common/types';

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

interface EverythingSpace extends Space {
  id: 'everything_space';
}
const EverythingSpace: EverythingSpace = {
  id: 'everything_space',
  name: 'everything_space',
  disabledFeatures: [],
};

interface NothingSpace extends Space {
  id: 'nothing_space';
}
const NothingSpace: NothingSpace = {
  id: 'nothing_space',
  name: 'nothing_space',
  disabledFeatures: Object.keys(new Features()),
};

interface AdvancedSettingsDisabledSpace extends Space {
  id: 'advanced_settings_disabled_space';
}
const AdvancedSettingsDisabledSpace: AdvancedSettingsDisabledSpace = {
  id: 'advanced_settings_disabled_space',
  name: 'advanced_settings_disabled_space',
  disabledFeatures: ['advancedSettings'],
};

interface ApmDisabledSpace extends Space {
  id: 'apm_disabled_space';
}
const ApmDisabledSpace: ApmDisabledSpace = {
  id: 'apm_disabled_space',
  name: 'apm_disabled_space',
  disabledFeatures: ['apm'],
};

interface CanvasDisabledSpace extends Space {
  id: 'canvas_disabled_space';
}
const CanvasDisabledSpace: CanvasDisabledSpace = {
  id: 'canvas_disabled_space',
  name: 'canvas_disabled_space',
  disabledFeatures: ['canvas'],
};

interface DashboardDisabledSpace extends Space {
  id: 'dashboard_disabled_space';
}
const DashboardDisabledSpace: DashboardDisabledSpace = {
  id: 'dashboard_disabled_space',
  name: 'dashboard_disabled_space',
  disabledFeatures: ['dashboard'],
};

interface DevToolsDisabledSpace extends Space {
  id: 'dev_tools_disabled_space';
}
const DevToolsDisabledSpace: DevToolsDisabledSpace = {
  id: 'dev_tools_disabled_space',
  name: 'dev_tools_disabled_space',
  disabledFeatures: ['dev_tools'],
};

interface DiscoverDisabledSpace extends Space {
  id: 'discover_disabled_space';
}
const DiscoverDisabledSpace: DiscoverDisabledSpace = {
  id: 'discover_disabled_space',
  name: 'discover_disabled_space',
  disabledFeatures: ['discover'],
};

interface MapsDisabledSpace extends Space {
  id: 'maps_disabled_space';
}
const MapsDisabledSpace: MapsDisabledSpace = {
  id: 'maps_disabled_space',
  name: 'maps_disabled_space',
  disabledFeatures: ['maps'],
};

interface GraphDisabledSpace extends Space {
  id: 'graph_disabled_space';
}
const GraphDisabledSpace: GraphDisabledSpace = {
  id: 'graph_disabled_space',
  name: 'graph_disabled_space',
  disabledFeatures: ['graph'],
};

interface InfrastructureDisabledSpace extends Space {
  id: 'infrastructure_disabled_space';
}
const InfrastructureDisabledSpace: InfrastructureDisabledSpace = {
  id: 'infrastructure_disabled_space',
  name: 'infrastructure_disabled_space',
  disabledFeatures: ['infrastructure'],
};

interface LogsDisabledSpace extends Space {
  id: 'logs_disabled_space';
}
const LogsDisabledSpace: LogsDisabledSpace = {
  id: 'logs_disabled_space',
  name: 'logs_disabled_space',
  disabledFeatures: ['logs'],
};

interface MlDisabledSpace extends Space {
  id: 'ml_disabled_space';
}
const MlDisabledSpace: MlDisabledSpace = {
  id: 'ml_disabled_space',
  name: 'ml_disabled_space',
  disabledFeatures: ['ml'],
};

interface MonitoringDisabledSpace extends Space {
  id: 'monitoring_disabled_space';
}
const MonitoringDisabledSpace: MonitoringDisabledSpace = {
  id: 'monitoring_disabled_space',
  name: 'monitoring_disabled_space',
  disabledFeatures: ['monitoring'],
};

interface TimelionDisabledSpace extends Space {
  id: 'timelion_disabled_space';
}
const TimelionDisabledSpace: TimelionDisabledSpace = {
  id: 'timelion_disabled_space',
  name: 'timelion_disabled_space',
  disabledFeatures: ['timelion'],
};

interface UptimeDisabledSpace extends Space {
  id: 'uptime_disabled_space';
}
const UptimeDisabledSpace: UptimeDisabledSpace = {
  id: 'uptime_disabled_space',
  name: 'uptime_disabled_space',
  disabledFeatures: ['uptime'],
};

interface VisualizeDisabledSpace extends Space {
  id: 'visualize_disabled_space';
}
const VisualizeDisabledSpace: VisualizeDisabledSpace = {
  id: 'visualize_disabled_space',
  name: 'visualize_disabled_space',
  disabledFeatures: ['visualize'],
};

export type SpaceScenarios =
  | EverythingSpace
  | NothingSpace
  | AdvancedSettingsDisabledSpace
  | ApmDisabledSpace
  | CanvasDisabledSpace
  | DashboardDisabledSpace
  | DevToolsDisabledSpace
  | DiscoverDisabledSpace
  | MapsDisabledSpace
  | GraphDisabledSpace
  | InfrastructureDisabledSpace
  | LogsDisabledSpace
  | MlDisabledSpace
  | MonitoringDisabledSpace
  | TimelionDisabledSpace
  | UptimeDisabledSpace
  | VisualizeDisabledSpace;
export const SpaceScenarios: SpaceScenarios[] = [
  EverythingSpace,
  NothingSpace,
  AdvancedSettingsDisabledSpace,
  ApmDisabledSpace,
  CanvasDisabledSpace,
  DashboardDisabledSpace,
  DevToolsDisabledSpace,
  DiscoverDisabledSpace,
  MapsDisabledSpace,
  GraphDisabledSpace,
  InfrastructureDisabledSpace,
  LogsDisabledSpace,
  MlDisabledSpace,
  MonitoringDisabledSpace,
  TimelionDisabledSpace,
  UptimeDisabledSpace,
  VisualizeDisabledSpace,
];
