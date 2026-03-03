/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { declareServices, Start } from '@kbn/core-di';
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { SloCreateFlyoutToken, SloDetailsFlyoutToken } from '@kbn/slo-flyout-types';
import { SLOPlugin } from './plugin';
import type {
  SLOPublicSetup,
  SLOPublicStart,
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart,
} from './types';

export const plugin: PluginInitializer<
  SLOPublicSetup,
  SLOPublicStart,
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new SLOPlugin(initializerContext);
};

/**
 * Publishes SLO flyout factories via {@link Global}.
 *
 * Both tokens use `toResolvedValue` with `Start`, which the platform
 * auto-bridges to the value returned by the classic `start()` method.
 * No manual `rebindSync` is needed.
 */
export const services = declareServices(({ publish }) => {
  publish(SloCreateFlyoutToken, Start, (start: SLOPublicStart) => start.getCreateSLOFormFlyout);
  publish(SloDetailsFlyoutToken, Start, (start: SLOPublicStart) => start.getSLODetailsFlyout);
});

export type {
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart,
  SLOPublicStart,
  SLOPublicSetup,
} from './types';
