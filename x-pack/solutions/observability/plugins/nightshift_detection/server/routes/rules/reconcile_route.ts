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
import { ScopedReconcileRunner } from '../../lib/rules/scoped_reconcile_runner';
import { DetectionAccountService } from '../../lib/service_account/detection_account';
import { BaseEngineRoute } from '../base_engine_route';
import { DETECTION_ENGINE_API_PATH } from '../constants';
import { EngineRouteContext } from '../engine_route_context';

/**
 * Makes the space's managed alerting rules match what the strategies want now, as the space's
 * detection service account. Called by the rule reconcile workflow after knowledge or sources change.
 */
@injectable()
export class ReconcileRulesRoute extends BaseEngineRoute {
  static method = 'post' as const;
  static path = `${DETECTION_ENGINE_API_PATH}/rules/_reconcile`;
  static security: RouteSecurity = {
    authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] },
  };
  static options = {
    access: 'internal' as const,
    summary: 'Reconcile the detection rules of this space',
    description:
      'Creates, deletes, enables and disables the alerting rules the detection strategies need in the space, and leaves every other rule alone. The space runs as its detection service account; a user is swapped for the account, any other service account is refused. Answers busy when another reconciliation holds the space.',
  };
  static validate = false as const;

  constructor(
    @inject(EngineRouteContext) ctx: EngineRouteContext,
    @inject(Request) request: KibanaRequest,
    @inject(DetectionAccountService) private readonly account: DetectionAccountService,
    @inject(ScopedReconcileRunner) private readonly reconciler: ScopedReconcileRunner
  ) {
    super(ctx, request);
  }

  protected async execute(): Promise<IKibanaResponse> {
    const spaceId = this.getSpaceId();

    // Another account's workflow must not change this space's rules; a user's call is allowed.
    await this.account.assertServiceAccountActsForSpace({ request: this.request, spaceId });

    const controller = new AbortController();
    const subscription = this.request.events.aborted$.subscribe(() =>
      controller.abort('the request was aborted')
    );

    try {
      const result = await this.account.asDetectionEngineAccount({
        request: this.request,
        spaceId,
        fn: (accountRequest) =>
          this.reconciler.run({ accountRequest, spaceId, abortSignal: controller.signal }),
      });

      return this.ctx.response.ok({ body: result });
    } finally {
      subscription.unsubscribe();
    }
  }
}
