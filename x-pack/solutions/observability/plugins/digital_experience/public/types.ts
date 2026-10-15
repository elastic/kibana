/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { UxPluginSetup, UxPluginStart } from '@kbn/ux-plugin/public';

export interface DigitalExperienceSetupDeps {
  data: DataPublicPluginSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  ux?: UxPluginSetup;
}

export interface DigitalExperienceStartDeps {
  data: DataPublicPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  ux?: UxPluginStart;
}

export type DigitalExperienceServices = CoreStart & DigitalExperienceStartDeps;
