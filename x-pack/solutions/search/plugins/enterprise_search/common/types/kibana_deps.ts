/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { SearchIndicesPluginSetup } from '@kbn/search-indices/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export interface KibanaDeps {
  charts: ChartsPluginStart;
  cloud: CloudStart;
  console?: ConsolePluginStart;
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  features: FeaturesPluginStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  licensing: LicensingPluginStart;
  navigation: NavigationPublicPluginStart;
  searchIndices: SearchIndicesPluginSetup;
  security: SecurityPluginStart;
  share: SharePluginStart;
  spaces: SpacesPluginStart;
}
