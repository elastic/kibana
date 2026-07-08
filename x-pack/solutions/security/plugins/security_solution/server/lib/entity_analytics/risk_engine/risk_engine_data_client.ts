/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { InitRiskEngineResult } from '../../../../common/entity_analytics/risk_engine';
import {
  updateSavedObjectAttribute,
  getConfiguration,
  initSavedObjects,
  deleteSavedObjects,
} from './utils/saved_object_configuration';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import { removeRiskScoringTask } from '../risk_score/tasks';
import { RiskEngineAuditActions } from './audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import type { RiskEngineConfiguration } from '../types';

interface InitOpts {
  namespace: string;
  taskManager: TaskManagerStartContract;
  riskScoreDataClient: RiskScoreDataClient;
}

interface TearDownParams {
  taskManager: TaskManagerStartContract;
  riskScoreDataClient: RiskScoreDataClient;
}

interface RiskEngineDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  auditLogger: AuditLogger | undefined;
}

export class RiskEngineDataClient {
  constructor(private readonly options: RiskEngineDataClientOpts) {}

  public async init({ namespace, taskManager, riskScoreDataClient }: InitOpts) {
    const result: InitRiskEngineResult = {
      riskEngineResourcesInstalled: false,
      riskEngineConfigurationCreated: false,
      riskEngineEnabled: false,
      errors: [] as string[],
    };

    try {
      await riskScoreDataClient.init();
      await riskScoreDataClient.initLegacyTransforms();
      result.riskEngineResourcesInstalled = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    try {
      const soResult = await initSavedObjects({
        savedObjectsClient: this.options.soClient,
        namespace,
      });
      this.options.logger.info(
        `Risk engine savedObject configuration: ${JSON.stringify(soResult, null, 2)}`
      );
      result.riskEngineConfigurationCreated = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    return result;
  }

  public getConfiguration = () =>
    getConfiguration({
      logger: this.options.logger,
      savedObjectsClient: this.options.soClient,
      namespace: this.options.namespace,
    });

  public updateConfiguration = (config: Partial<RiskEngineConfiguration>) =>
    updateSavedObjectAttribute({
      logger: this.options.logger,
      savedObjectsClient: this.options.soClient,
      namespace: this.options.namespace,
      attributes: config,
    });

  public async disableRiskEngine({ taskManager }: { taskManager: TaskManagerStartContract }) {
    await removeRiskScoringTask({
      namespace: this.options.namespace,
      taskManager,
      logger: this.options.logger,
    });

    this.options.auditLogger?.log({
      message: 'User removed risk scoring task',
      event: {
        action: RiskEngineAuditActions.RISK_ENGINE_REMOVE_TASK,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.CHANGE,
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });

    return updateSavedObjectAttribute({
      logger: this.options.logger,
      savedObjectsClient: this.options.soClient,
      namespace: this.options.namespace,
      attributes: {
        enabled: false,
      },
    });
  }

  /**
   * Delete all risk engine resources.
   *
   * It returns an array of errors that occurred during the deletion.
   *
   * WARNING: It will remove all data.
   */
  public async tearDown({ taskManager, riskScoreDataClient }: TearDownParams) {
    const errors: Error[] = [];
    const addError = (e: Error) => errors.push(e);

    await removeRiskScoringTask({
      namespace: this.options.namespace,
      taskManager,
      logger: this.options.logger,
    }).catch(addError);

    await deleteSavedObjects({
      logger: this.options.logger,
      savedObjectsClient: this.options.soClient,
      namespace: this.options.namespace,
    }).catch(addError);
    const riskScoreErrors = await riskScoreDataClient.tearDown();

    return errors.concat(riskScoreErrors);
  }

  public async updateRiskEngineSavedObject(attributes: {}) {
    try {
      const configuration = await this.getConfiguration();
      if (!configuration) {
        await initSavedObjects({
          savedObjectsClient: this.options.soClient,
          namespace: this.options.namespace,
        });
      }
      return await updateSavedObjectAttribute({
        logger: this.options.logger,
        savedObjectsClient: this.options.soClient,
        namespace: this.options.namespace,
        attributes,
      });
    } catch (e) {
      this.options.logger.error(
        `Error updating risk score engine saved object attributes: ${e.message}`
      );
      throw e;
    }
  }
}
