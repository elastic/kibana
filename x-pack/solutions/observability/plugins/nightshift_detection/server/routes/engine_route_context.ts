/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { PluginStart } from '@kbn/core-di';
import { Response } from '@kbn/core-di-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { AvailabilityService } from '../lib/availability/availability_service';

/** What every engine route needs from the platform, injected once instead of per route. */
@injectable()
export class EngineRouteContext {
  constructor(
    @inject(Response) public readonly response: KibanaResponseFactory,
    @inject(AvailabilityService) public readonly availability: AvailabilityService,
    @inject(PluginStart<SpacesPluginStart>('spaces')) private readonly spaces: SpacesPluginStart
  ) {}

  /** The space the request is made in. */
  public getSpaceId(request: KibanaRequest): string {
    return this.spaces.spacesService.getSpaceId(request);
  }
}
