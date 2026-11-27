/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { CoreStart as CoreStartToken } from '@kbn/core-di-server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { EngineHttpError } from '../errors/engine_http_error';
import { createNotSetUpError } from '../errors/create_not_set_up_error';
import { getStatusCode } from '../errors/get_status_code';
import { DETECTION_ENGINE_WORKLOAD_ID, DETECTION_ENGINE_WORKLOAD_TYPE } from './workload';

/** The detection engine's identity: the service account bound to each space. */
@injectable()
export class DetectionAccountService {
  constructor(
    @inject(CoreStartToken('security')) private readonly security: CoreStart['security'],
    @inject(CoreStartToken('elasticsearch'))
    private readonly elasticsearch: CoreStart['elasticsearch']
  ) {}

  /** Whether the deployment has service accounts at all. */
  public isEnabled(): boolean {
    return this.security.serviceAccounts.isEnabled();
  }

  /** The id of the account the space's detection engine runs as, or `undefined` when not set up. */
  public async getDetectionEngineAccountId({
    spaceId,
  }: {
    spaceId: string;
  }): Promise<string | undefined> {
    if (!this.isEnabled()) {
      return undefined;
    }

    try {
      const binding = await this.security.serviceAccounts.getWorkloadBinding({
        workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
        workloadId: DETECTION_ENGINE_WORKLOAD_ID,
        spaceId,
      });

      return binding?.serviceAccountId;
    } catch (error) {
      // Core answers 403 when the stored binding fails its integrity check, and its own `bind`
      // then treats the space as having no binding. Doing the same lets `_enable` replace it,
      // where a thrown error would leave the space unrepairable.
      if (getStatusCode(error) === 403) {
        return undefined;
      }

      throw error;
    }
  }

  /** Whether the request's user holds `manage_security`, which binding an account requires. */
  public async canManageSecurity({ request }: { request: KibanaRequest }): Promise<boolean> {
    const { has_all_requested: allowed } = await this.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({ cluster: ['manage_security'] });

    return allowed;
  }

  /**
   * Whether the request's user can call `_enable` in the space: `manage_security`, which binding
   * requires, and the Nightshift manage privilege, which the route requires. Elasticsearch answers
   * both in one call, so the status never offers setup to a user the route would refuse.
   */
  public async canSetUp({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<boolean> {
    const { has_all_requested: allowed } = await this.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({
        cluster: ['manage_security'],
        application: [
          {
            application: 'kibana-.kibana',
            resources: [`space:${spaceId}`],
            privileges: [`api:${NIGHTSHIFT_API_PRIVILEGES.manage}`],
          },
        ],
      });

    return allowed;
  }

  /**
   * Runs `fn` with a request authenticated as the account bound to the space's detection engine.
   * With `expectedAccountId`, refuses when the space was rebound to another account in between.
   */
  public withDetectionEngineAccount<T>({
    spaceId,
    expectedAccountId,
    fn,
  }: {
    spaceId: string;
    expectedAccountId?: string;
    fn: (accountRequest: KibanaRequest) => Promise<T>;
  }): Promise<T> {
    return this.security.serviceAccounts.withScopedRequestForWorkload(
      {
        workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
        workloadId: DETECTION_ENGINE_WORKLOAD_ID,
        spaceId,
        expectedServiceAccountId: expectedAccountId,
        executionId: uuidv4(),
      },
      fn
    );
  }

  /**
   * Runs `fn` as the space's account, refused with 503 when the space is not set up. A user's
   * request is swapped for one authenticated as the account. A service account's request is used
   * as it is when it is the space's account, such as a bound workflow run calling back into
   * Kibana, and refused with 403 otherwise: only that account may act for the detection engine.
   */
  public async asDetectionEngineAccount<T>({
    request,
    spaceId,
    fn,
  }: {
    request: KibanaRequest;
    spaceId: string;
    fn: (accountRequest: KibanaRequest) => Promise<T>;
  }): Promise<T> {
    const accountId = await this.getDetectionEngineAccountId({ spaceId });

    if (accountId === undefined) {
      throw createNotSetUpError({ serviceAccountsEnabled: this.isEnabled() });
    }

    const principal = this.security.authc.getPrincipal(request);

    if (principal?.type !== 'service_account') {
      return this.withDetectionEngineAccount({ spaceId, expectedAccountId: accountId, fn });
    }

    this.assertIsSpaceAccount({ serviceAccountId: principal.serviceAccountId, accountId });

    return fn(request);
  }

  /**
   * Refuses a service account that is not the space's detection engine account. A user's request
   * passes: only service accounts are held to the space's account, so another Nightshift account
   * cannot act for this engine, and a space that is not set up refuses every service account.
   */
  public async assertServiceAccountActsForSpace({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void> {
    const principal = this.security.authc.getPrincipal(request);

    if (principal?.type !== 'service_account') {
      return;
    }

    const accountId = await this.getDetectionEngineAccountId({ spaceId });

    if (accountId === undefined) {
      throw createNotSetUpError({ serviceAccountsEnabled: this.isEnabled() });
    }

    this.assertIsSpaceAccount({ serviceAccountId: principal.serviceAccountId, accountId });
  }

  private assertIsSpaceAccount({
    serviceAccountId,
    accountId,
  }: {
    serviceAccountId: string;
    accountId: string;
  }): void {
    if (serviceAccountId !== accountId) {
      throw new EngineHttpError(
        `Service account [${serviceAccountId}] is not the detection engine account of this space`,
        403
      );
    }
  }
}
