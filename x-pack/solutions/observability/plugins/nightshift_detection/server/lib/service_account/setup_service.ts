/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { inject, injectable } from 'inversify';
import type { CoreStart, KibanaRequest, Logger, PluginInitializerContext } from '@kbn/core/server';
import { Logger as CoreLogger, PluginStart } from '@kbn/core-di';
import { CoreStart as CoreStartToken, PluginInitializer } from '@kbn/core-di-server';
import { getNightshiftRoleName, getNightshiftServiceAccountName } from '@kbn/nightshift-shared';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  DetectionEngineEnableResponse,
  DetectionEngineServiceAccountStatus,
} from '../../../common/service_account';
import { EngineHttpError } from '../errors/engine_http_error';
import { getStatusCode } from '../errors/get_status_code';
import { WorkflowInstaller } from '../workflows/workflow_installer';
import { DetectionAccountService } from './detection_account';
import { SpaceSetupLock } from './space_setup_lock';
import { DETECTION_ENGINE_WORKLOAD_ID, DETECTION_ENGINE_WORKLOAD_TYPE } from './workload';

const ACCOUNT_STATUS_FORBIDDEN = 403;

/** Sets a space up to run the detection engine as the deployment's `nightshift_detection` account. */
@injectable()
export class DetectionSetupService {
  private readonly role: string;

  constructor(
    @inject(DetectionAccountService) private readonly account: DetectionAccountService,
    @inject(WorkflowInstaller)
    private readonly workflows: Pick<WorkflowInstaller, 'install' | 'enable'>,
    @inject(SpaceSetupLock) private readonly setupLock: Pick<SpaceSetupLock, 'run'>,
    @inject(CoreStartToken('security')) private readonly security: CoreStart['security'],
    @inject(CoreStartToken('elasticsearch'))
    private readonly elasticsearch: CoreStart['elasticsearch'],
    @inject(PluginStart<SpacesPluginStart>('spaces')) private readonly spaces: SpacesPluginStart,
    @inject(CoreLogger) private readonly logger: Logger,
    @inject(PluginInitializer('env')) env: PluginInitializerContext['env']
  ) {
    this.role = getDetectionRoleName(env);
  }

  /**
   * Binds the account to the space's detection engine. Binding needs an authenticated user with
   * `manage_security`, so setup is an explicit admin action and cannot happen at startup.
   * Idempotent: binding again with another account rebinds the space.
   */
  public async enable({
    request,
    spaceId,
    serviceAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }): Promise<DetectionEngineEnableResponse> {
    if (!this.account.isEnabled()) {
      throw new EngineHttpError(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.',
        400
      );
    }

    if (!(await this.account.canManageSecurity({ request }))) {
      throw new EngineHttpError(
        'Setting up the detection engine service account requires the manage_security cluster privilege.',
        403
      );
    }

    // Sequential on purpose: a missing space answers 404 before a missing role answers 400.
    await this.assertSpaceExists({ request, spaceId });
    await this.assertRoleExists({ request });

    // One setup per space at a time: two calls for different accounts would otherwise bind and
    // install the same space against each other, and the workflow could end up running as the
    // account that lost the binding, which every tick refuses.
    const outcome = await this.setupLock.run({
      spaceId,
      callback: () => this.setUpSpace({ request, spaceId, serviceAccountId }),
    });

    if (!outcome.ran) {
      throw new EngineHttpError(
        `Another setup of space [${spaceId}] is in progress. Call _enable again once it has finished.`,
        409
      );
    }

    return outcome.result;
  }

  /** What `enable` does while it holds the space's setup lock. */
  private async setUpSpace({
    request,
    spaceId,
    serviceAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }): Promise<DetectionEngineEnableResponse> {
    // Bound first, so what the engine does outside workflow runs is tied to the account before
    // any workflow is. Binding again with another account rebinds the space.
    const previousAccountId = await this.account.getDetectionEngineAccountId({ spaceId });
    await this.security.serviceAccounts.bindWorkload(request, {
      serviceAccountId,
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });

    // The UI reads the binding alone to decide whether to offer setup, so a failed call must not
    // leave a space that was never set up reading as set up. Once the workflow install has
    // started, the workflow runs as the new account: putting a rebound space back on its previous
    // account would split the engine and its workflow across two accounts, so a rebound space keeps
    // the new binding and a retry converges on it. A first install leaves the workflow off, so a
    // space that was never set up has nothing running to undo.
    let isInstallStarted = false;

    try {
      await this.assertBoundAccountIsDetectionAccount({ spaceId, serviceAccountId });

      isInstallStarted = true;
      await this.workflows.install({ request, spaceId, serviceAccountId });

      // The setup lock keeps another `_enable` out, so this only catches a binding changed by
      // something else, which a workflow bound to this account must not outlive.
      const currentAccountId = await this.account.getDetectionEngineAccountId({ spaceId });

      if (currentAccountId !== serviceAccountId) {
        throw new EngineHttpError(
          `The detection engine of space [${spaceId}] is now bound to [${currentAccountId}] instead of [${serviceAccountId}], so a concurrent _enable replaced this one. Call _enable again with the account you want.`,
          409
        );
      }

      // Last, so a call that failed or lost a race above never switches the workflow on.
      await this.workflows.enable({ request, spaceId, serviceAccountId });
    } catch (error) {
      if (!isInstallStarted || previousAccountId === undefined) {
        await this.restorePreviousBinding({
          request,
          spaceId,
          serviceAccountId,
          previousAccountId,
        });
      }

      throw error;
    }

    return { spaceId, serviceAccountId };
  }

  /** What the current user can see about the space's setup. */
  public async getStatus({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<DetectionEngineServiceAccountStatus> {
    const serviceAccountsEnabled = this.account.isEnabled();
    const [serviceAccountId, canSetUp] = await Promise.all([
      this.account.getDetectionEngineAccountId({ spaceId }),
      // A failing privilege probe must not fail a read: it reads as "cannot set up".
      serviceAccountsEnabled
        ? this.account.canSetUp({ request, spaceId }).catch(() => false)
        : false,
    ]);

    return {
      serviceAccountsEnabled,
      canSetUp,
      role: this.role,
      serviceAccountId: serviceAccountId ?? null,
    };
  }

  private async assertSpaceExists({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void> {
    try {
      await this.spaces.spacesService.createSpacesClient(request).get(spaceId);
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 404) {
        throw new EngineHttpError(`Space [${spaceId}] does not exist.`, 404);
      }

      throw error;
    }
  }

  // An account holding a role that does not exist has no privileges, and every run would then be
  // refused. Kibana never creates the role. Looked up with the query API: `getRole` answers 404
  // for the predefined roles of Serverless.
  private async assertRoleExists({ request }: { request: KibanaRequest }): Promise<void> {
    const { total } = await this.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.queryRole({ query: { term: { name: this.role } }, size: 1 });

    if (total === 0) {
      throw new EngineHttpError(
        `The role [${this.role}] of the detection engine service account does not exist. Create it (see the plugin README, "Setting up a space"), then call _enable again.`,
        400
      );
    }
  }

  // Puts the space back on the account it had before `enable`. A failure here is logged rather than
  // thrown, so the caller still learns why `enable` failed instead of a rollback error.
  private async restorePreviousBinding({
    request,
    spaceId,
    serviceAccountId,
    previousAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
    previousAccountId: string | undefined;
  }): Promise<void> {
    try {
      // A concurrent `enable` may have bound the space since: its binding is not this call's to
      // undo. Bindings have no compare-and-set, so this narrows the race rather than closing it.
      if ((await this.account.getDetectionEngineAccountId({ spaceId })) !== serviceAccountId) {
        return;
      }

      const workload = {
        workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
        workloadId: DETECTION_ENGINE_WORKLOAD_ID,
      };

      if (previousAccountId) {
        await this.security.serviceAccounts.bindWorkload(request, {
          serviceAccountId: previousAccountId,
          ...workload,
        });
      } else {
        await this.security.serviceAccounts.unbindWorkload(request, workload);
      }
    } catch (error) {
      this.logger.error(
        `Could not restore the detection engine binding of the space${
          previousAccountId ? ` to [${previousAccountId}]` : ''
        }; it may still be bound to the refused account. Call _enable again with the right account: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Core cannot look an account up before binding it, so the binding is read back: its summary
  // is empty when the account does not exist. The account must be the one `nightshift_detection`
  // that Kibana can run as. The role is not checked: core's summary does not carry it, and the setup
  // step creates the account with it by name. Binding
  // any other account would leave every later run failing with an opaque token exchange error, so
  // the call is refused and `enable` puts the space back as it was.
  private async assertBoundAccountIsDetectionAccount({
    spaceId,
    serviceAccountId,
  }: {
    spaceId: string;
    serviceAccountId: string;
  }): Promise<void> {
    const expectedName = getNightshiftServiceAccountName('detection');
    let summary: Awaited<
      ReturnType<CoreStart['security']['serviceAccounts']['getWorkloadServiceAccountSummary']>
    >;

    try {
      summary = await this.security.serviceAccounts.getWorkloadServiceAccountSummary({
        workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
        workloadId: DETECTION_ENGINE_WORKLOAD_ID,
        spaceId,
      });
    } catch (error) {
      // UIAM answers 403 when Kibana's own identity may not read the account, as in the local
      // UIAM of the functional tests. The account cannot be checked then, and refusing would make
      // the space impossible to set up. A missing, renamed or disabled account is still refused.
      // Any other failure leaves the account unchecked, so the call fails and the binding goes.
      if (getStatusCode(error) !== ACCOUNT_STATUS_FORBIDDEN) {
        throw error;
      }

      this.logger.warn(
        `Could not verify that service account [${serviceAccountId}] is the [${expectedName}] account: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return;
    }

    if (summary?.name === expectedName && summary.enabled && summary.assumable) {
      return;
    }

    if (summary === null) {
      throw new EngineHttpError(
        `Service account [${serviceAccountId}] does not exist. Use the id of the [${expectedName}] account.`,
        400
      );
    }

    // On stateful, an account created outside Kibana has no credential stored here, so every run as
    // it would fail even though its name and state look right.
    if (summary.name === expectedName && summary.enabled) {
      throw new EngineHttpError(
        `Service account [${serviceAccountId}] is [${expectedName}], but Kibana holds no credential to run as it. Create the account through the Kibana service accounts API and use its id.`,
        400
      );
    }

    throw new EngineHttpError(
      `Service account [${serviceAccountId}] is [${summary.name}]${
        summary.enabled ? '' : ' and disabled'
      }, not an enabled [${expectedName}] account. Use the id of the [${expectedName}] account.`,
      400
    );
  }
}

/** The role the detection account must hold, named by the build flavor. */
const getDetectionRoleName = (env: PluginInitializerContext['env']): string =>
  getNightshiftRoleName('detection', {
    isServerless: env.packageInfo.buildFlavor === 'serverless',
  });
