/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import {
  createServerStepDefinition,
  type WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { checkEntityStoreIndexPrivileges } from '../../routes/apis/utils/check_and_format_privileges';
import { ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES } from '../../routes/constants';
import {
  MAX_WORKFLOW_MESSAGE_LENGTH,
  updateAssetCriticalityStepCommonDefinition,
} from '../../../common/workflow/steps/update_asset_criticality';
import type { EntityStoreStartContract } from '../../types';

// Leaves room for the base message (which includes the caller-controlled `entity_id`) so the
// combined message still fits within `MAX_WORKFLOW_MESSAGE_LENGTH` after truncation below.
const MAX_RECALC_ERROR_MESSAGE_LENGTH = 200;

export const getUpdateAssetCriticalityStepDefinition = (
  getCreateCRUDClient: () => Promise<EntityStoreStartContract['createCRUDClient']>,
  getWorkflowsExtensionsStart: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>,
  getLicensingStart: () => Promise<LicensingPluginStart>,
  getSecurityStart: () => Promise<SecurityPluginStart>
) =>
  createServerStepDefinition({
    ...updateAssetCriticalityStepCommonDefinition,
    handler: async (context) => {
      const {
        entity_type: entityType,
        entity_id: entityId,
        criticality_level: criticalityLevel,
      } = context.input;
      const { 'recalculate-risk-score': recalculateRiskScore } = context.config;

      try {
        const createCRUDClient = await getCreateCRUDClient();
        const esClient = context.contextManager.getScopedEsClient();
        const { workflow } = context.contextManager.getContext();
        const workflowsExtensions = await getWorkflowsExtensionsStart();
        const security = await getSecurityStart();
        const fakeRequest = context.contextManager.getFakeRequest();

        const {
          has_write_permissions: hasWritePermissions,
          has_kibana_feature_access: hasKibanaFeatureAccess,
        } = await checkEntityStoreIndexPrivileges({
          request: fakeRequest,
          security,
          spaceId: workflow.spaceId,
          kibanaFeaturePrivileges: ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES,
        });

        if (!hasWritePermissions || !hasKibanaFeatureAccess) {
          throw new ExecutionError({
            type: 'PermissionError',
            message: 'You do not have permission to update asset criticality in this space.',
          });
        }

        const crudClient = createCRUDClient(
          esClient,
          workflow.spaceId,
          workflowsExtensions
            ? () => workflowsExtensions.getClient(context.contextManager.getFakeRequest())
            : undefined
        );

        // `force: true` is required because `asset.criticality` is not marked
        // `allowAPIUpdate` in the Entity Store field retention definitions.
        await crudClient.updateEntity(
          entityType,
          { entity: { id: entityId }, asset: { criticality: criticalityLevel } },
          true
        );

        let message =
          criticalityLevel === null
            ? `Successfully removed criticality level for entity ${entityId}`
            : `Successfully set criticality level to "${criticalityLevel}" for entity ${entityId}`;

        // Risk score recalculation requires at least a platinum license, matching the
        // `/internal/risk_score/calculation/entity_v2` route's own gating.
        if (recalculateRiskScore) {
          const licensing = await getLicensingStart();
          const license = await licensing.getLicense();

          if (license.hasAtLeast('platinum')) {
            try {
              await context.contextManager.callKibanaApi({
                method: 'POST',
                path: '/internal/risk_score/calculation/entity_v2',
                headers: { 'elastic-api-version': '1' },
                body: {
                  identifier: entityId,
                  identifier_type: entityType,
                  entity_id: entityId,
                },
              });
              message += ' and triggered risk score recalculation';
            } catch (recalcError) {
              // Risk score recalculation is a side effect of a successful criticality update, so
              // its failure (e.g. no risk engine configured for this space) should not fail the
              // step or roll back the write that already committed.
              const recalcErrorMessage = truncate(
                recalcError instanceof Error ? recalcError.message : 'Unknown error occurred',
                { length: MAX_RECALC_ERROR_MESSAGE_LENGTH, omission: '…' }
              );
              message += ` but risk score recalculation failed: ${recalcErrorMessage}`;
            }
          } else {
            message +=
              ' but skipped risk score recalculation because it requires at least a platinum license';
          }
        }

        return {
          output: {
            success: true,
            // `entity_id` (up to `MAX_ENTITY_ID_VALUE_LENGTH` chars) is interpolated above, so the
            // combined message can exceed the output schema's `MAX_WORKFLOW_MESSAGE_LENGTH` even
            // after capping the recalculation error detail; truncate to guarantee schema validity.
            message: truncate(message, { length: MAX_WORKFLOW_MESSAGE_LENGTH, omission: '…' }),
          },
        };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: {
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : { message: 'Unknown error occurred' },
          },
        });
      }
    },
  });
