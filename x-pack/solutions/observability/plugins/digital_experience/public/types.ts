/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UxPluginStart } from '@kbn/ux-plugin/public';

export interface DigitalExperienceSetupDeps {
  observabilityShared: ObservabilitySharedPluginSetup;
  share: SharePluginSetup;
}

export interface DigitalExperienceStartDeps {
  data: DataPublicPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  share: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  /** Undefined on serverless, which disables the ux plugin and so has no Classic RUM data. */
  ux?: UxPluginStart;
  /**
   * The frustration dashboard needs both of these, and the Overview's vitals trend needs Lens;
   * without them the page shows a prompt and the Overview leaves the trend out.
   */
  dashboard?: DashboardStart;
  lens?: LensPublicStart;
}

export type DigitalExperienceServices = CoreStart & DigitalExperienceStartDeps;
