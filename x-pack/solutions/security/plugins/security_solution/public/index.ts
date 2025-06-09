/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '@kbn/core/public';

import { Plugin } from './plugin';
import type { PluginSetup, PluginStart } from './types';
export type { TimelineModel } from './timelines/store/model';
export type { LinkItem } from './common/links';
export { alertSummaryLink } from './detections/links';
export { links as attackDiscoveryLinks } from './attack_discovery/links';
export { links as casesLinks } from './cases/links';
export { configurationsLinks } from './configurations/links';
export { links as rulesLinks } from './rules/links';
export { onboardingLinks } from './onboarding/links';
export { links as managementLinks, getManagementFilteredLinks } from './management/links';
export type { AppLinkItems, NormalizedLinks } from './common/links/types';
export type { FetchRulesResponse } from './detection_engine/rule_management/logic/types';
export { existCapabilities, hasCapabilities } from './common/lib/capabilities';
export { ContractComponentsService } from './contract_components';
export { OnboardingService } from './onboarding/service';

export const plugin = (context: PluginInitializerContext): Plugin => new Plugin(context);

export type { PluginSetup, PluginStart };
export { Plugin };
