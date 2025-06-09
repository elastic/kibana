/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { FleetStart } from '@kbn/fleet-plugin/public';

// Setup contracts
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionAiForSocPluginSetup {}

export interface SecuritySolutionAiForSocSetupPluginDependencies {
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  management: ManagementSetup;
  security: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
  cases?: CasesPublicSetup;
}

// Start contracts
export interface SecuritySolutionAiForSocPluginStart {
  getGreeting(): string;
  setSolutionNavigationTree(navigationTree: NavigationTreeDefinition): void;
}

export interface SecuritySolutionAiForSocStartPluginDependencies {
  licensing: LicensingPluginStart;
  fleet: FleetStart;
  security: SecurityPluginStart;
}

/**
 * Services available at runtime to the application
 */
export type StartServices = CoreStart &
  SecuritySolutionAiForSocStartPluginDependencies & {
    onAppLeave?: AppMountParameters['onAppLeave'];
    setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  };

export interface LinkItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  capabilities?: string[];
  links?: LinkItem[];
  licenseType?: string;
  experimentalKey?: string;
  hideWhenExperimentalKey?: string;
  uiSettingRequired?: string | { key: string; value: any };
  unavailable?: boolean;
  unauthorized?: boolean;
}

export type AppLinkItems = LinkItem[];

export interface ApplicationLinksUpdateParams {
  capabilities: any;
  experimentalFeatures: any;
  uiSettingsClient: any;
  upselling: any;
  license?: any;
}
