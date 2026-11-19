/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { inject, injectable } from 'inversify';
import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { Request } from '@kbn/core-di-server';
import type { DetectionEngineEnableBody } from '../../../common/service_account';
import { DetectionSetupService } from '../../lib/service_account/setup_service';
import { BaseEngineRoute } from '../base_engine_route';
import { EngineRouteContext } from '../engine_route_context';
import { DETECTION_ENGINE_API_PATH } from '../constants';

// Ids are opaque: `kibana/<name>` on stateful, a generated id on Serverless.
const SERVICE_ACCOUNT_ID_MAX_LENGTH = 1024;

/** Sets the current space up to run the detection engine as the given service account. */
@injectable()
export class EnableServiceAccountRoute extends BaseEngineRoute<DetectionEngineEnableBody> {
  static method = 'post' as const;
  static path = `${DETECTION_ENGINE_API_PATH}/service_account/_enable`;
  // The route needs the Nightshift manage privilege. Binding itself is authorized by Elasticsearch
  // against manage_security, a cluster privilege that route privileges cannot express, so the
  // setup service checks it as well.
  static security: RouteSecurity = {
    authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] },
  };
  static options = {
    access: 'internal' as const,
    summary: 'Set up the detection engine in this space to run as its service account',
    description:
      'Binds the deployment-wide detection service account to this space. Requires the Nightshift manage privilege, the manage_security cluster privilege and an existing role for the account; the engine never creates the role.',
  };
  static validate = {
    request: {
      body: schema.object({
        serviceAccountId: schema.string({ minLength: 1, maxLength: SERVICE_ACCOUNT_ID_MAX_LENGTH }),
      }),
    },
  };

  constructor(
    @inject(EngineRouteContext) ctx: EngineRouteContext,
    @inject(Request) request: KibanaRequest<unknown, unknown, DetectionEngineEnableBody>,
    @inject(DetectionSetupService) private readonly setup: DetectionSetupService
  ) {
    super(ctx, request);
  }

  protected async execute(): Promise<IKibanaResponse> {
    const result = await this.setup.enable({
      request: this.request,
      spaceId: this.getSpaceId(),
      serviceAccountId: this.request.body.serviceAccountId,
    });

    return this.ctx.response.ok({ body: result });
  }
}
