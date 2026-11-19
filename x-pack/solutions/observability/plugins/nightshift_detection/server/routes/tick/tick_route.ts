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
import { Request } from '@kbn/core-di-server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { DetectionEngineTickBody } from '../../../common/tick';
import { TickService } from '../../lib/engine/tick_service';
import { DetectionAccountService } from '../../lib/service_account/detection_account';
import { BaseEngineRoute } from '../base_engine_route';
import { DETECTION_ENGINE_API_PATH } from '../constants';
import { EngineRouteContext } from '../engine_route_context';

/**
 * A tick can run for as long as the engine's budget and the workflow's timeout, which is longer
 * than Kibana's default socket idle timeout (120 seconds), so the route sets its own.
 */
const TICK_IDLE_SOCKET_MS = 5 * 60_000;

/** Runs one tick of the engine in the current space, as the space's detection service account. */
@injectable()
export class TickRoute extends BaseEngineRoute<DetectionEngineTickBody> {
  static method = 'post' as const;
  static path = `${DETECTION_ENGINE_API_PATH}/_tick`;
  static security: RouteSecurity = {
    authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] },
  };
  static options = {
    access: 'internal' as const,
    timeout: { idleSocket: TICK_IDLE_SOCKET_MS },
    summary: 'Run one tick of the detection engine in this space',
    description:
      'Runs every due detection strategy of the space and stores the signals it finds. The space runs as its detection service account; a user is swapped for the account, any other service account is refused.',
  };
  static validate = {
    request: {
      body: schema.object({ skip_backlog: schema.boolean({ defaultValue: false }) }),
    },
  };

  constructor(
    @inject(EngineRouteContext) ctx: EngineRouteContext,
    @inject(Request) request: KibanaRequest<unknown, unknown, DetectionEngineTickBody>,
    @inject(DetectionAccountService) private readonly account: DetectionAccountService,
    @inject(TickService) private readonly tick: TickService
  ) {
    super(ctx, request);
  }

  protected async execute(): Promise<IKibanaResponse> {
    const spaceId = this.getSpaceId();

    // Another account's workflow must not run this space's engine; a user's call is allowed.
    await this.account.assertServiceAccountActsForSpace({ request: this.request, spaceId });

    // The run stops when the caller goes away, so a cancelled workflow does not leave a tick running.
    const controller = new AbortController();
    const subscription = this.request.events.aborted$.subscribe(() =>
      controller.abort('the request was aborted')
    );

    try {
      const result = await this.account.asDetectionEngineAccount({
        request: this.request,
        spaceId,
        fn: (accountRequest) =>
          this.tick.run({
            accountRequest,
            spaceId,
            skipBacklog: this.request.body.skip_backlog,
            abortSignal: controller.signal,
          }),
      });

      return this.ctx.response.ok({ body: result });
    } finally {
      subscription.unsubscribe();
    }
  }
}
