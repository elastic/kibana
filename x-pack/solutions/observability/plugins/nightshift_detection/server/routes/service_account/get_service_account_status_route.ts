/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { DetectionSetupService } from '../../lib/service_account/setup_service';
import { BaseEngineRoute } from '../base_engine_route';
import { EngineRouteContext } from '../engine_route_context';
import { DETECTION_ENGINE_API_PATH } from '../constants';

/** Reports how the current space is set up: the account it runs as, and whether the user may set it up. */
@injectable()
export class GetServiceAccountStatusRoute extends BaseEngineRoute {
  static method = 'get' as const;
  static path = `${DETECTION_ENGINE_API_PATH}/service_account`;
  static security: RouteSecurity = {
    authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] },
  };
  static options = {
    access: 'internal' as const,
    summary: 'Get the detection engine service account setup of this space',
    description:
      'Returns the account the space runs as, or null when it is not set up, the role the account must hold and whether the current user can set the space up.',
  };
  static validate = false as const;

  constructor(
    @inject(EngineRouteContext) ctx: EngineRouteContext,
    @inject(Request) request: KibanaRequest,
    @inject(DetectionSetupService) private readonly setup: DetectionSetupService
  ) {
    super(ctx, request);
  }

  protected async execute(): Promise<IKibanaResponse> {
    const status = await this.setup.getStatus({
      request: this.request,
      spaceId: this.getSpaceId(),
    });

    return this.ctx.response.ok({ body: status });
  }
}
