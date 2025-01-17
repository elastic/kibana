/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * the plugin (defined in `plugin.tsx`) has many dependencies that can be loaded only when the app is being used.
 * By loading these later we can reduce the initial bundle size and allow users to delay loading these dependencies until they are needed.
 */

import { AssetInventory } from './asset_inventory';
import { AttackDiscovery } from './attack_discovery';
import { Cases } from './cases';
import { Detections } from './detections';
import { Exceptions } from './exceptions';
import { Explore } from './explore';
import { Onboarding } from './onboarding';
import { Overview } from './overview';
import { Rules } from './rules';
import { Timelines } from './timelines';
import { Management } from './management';
import { CloudDefend } from './cloud_defend';
import { CloudSecurityPosture } from './cloud_security_posture';
import { ThreatIntelligence } from './threat_intelligence';
import { Dashboards } from './dashboards';
import { EntityAnalytics } from './entity_analytics';
import { Assets } from './assets';
import { Investigations } from './investigations';
import { MachineLearning } from './machine_learning';
import { SiemMigrations } from './siem_migrations';

/**
 * The classes used to instantiate the sub plugins. These are grouped into a single object for the sake of bundling them in a single dynamic import.
 */
const subPluginClasses = {
  AssetInventory,
  AttackDiscovery,
  Detections,
  Cases,
  Exceptions,
  Explore,
  Onboarding,
  Overview,
  Rules,
  Timelines,
  Management,
  Dashboards,
  CloudDefend,
  CloudSecurityPosture,
  ThreatIntelligence,
  EntityAnalytics,
  Assets,
  Investigations,
  MachineLearning,
  SiemMigrations,
};
export { subPluginClasses };
