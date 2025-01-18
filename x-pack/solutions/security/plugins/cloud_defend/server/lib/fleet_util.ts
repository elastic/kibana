/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatMap, uniq } from 'lodash';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyClient,
} from '@kbn/fleet-plugin/server';
import type {
  AgentPolicy,
  GetAgentStatusResponse,
  ListResult,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { errors } from '@elastic/elasticsearch';
import { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common';
import {
  INPUT_CONTROL,
  CLOUD_DEFEND_FLEET_PACKAGE_KUERY,
  INTEGRATION_PACKAGE_NAME,
} from '../../common/constants';
import { POLICIES_PACKAGE_POLICY_PREFIX } from '../../common/constants';
import type { PoliciesQueryParams } from '../../common';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

const isFleetMissingAgentHttpError = (error: unknown) =>
  error instanceof errors.ResponseError && error.statusCode === 404;

const isPolicyTemplate = (input: any) => input === INPUT_CONTROL;

const getPackageNameQuery = (packageName: string, benchmarkFilter?: string): string => {
  const integrationNameQuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`;
  const kquery = benchmarkFilter
    ? `${integrationNameQuery} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: *${benchmarkFilter}*`
    : integrationNameQuery;

  return kquery;
};

export type AgentStatusByAgentPolicyMap = Record<string, GetAgentStatusResponse['results']>;

export const getAgentStatusesByAgentPolicies = async (
  agentService: AgentService,
  agentPolicies: AgentPolicy[] | undefined,
  logger: Logger
): Promise<AgentStatusByAgentPolicyMap> => {
  if (!agentPolicies?.length) return {};

  const internalAgentService = agentService.asInternalUser;
  const result: AgentStatusByAgentPolicyMap = {};

  try {
    for (const agentPolicy of agentPolicies) {
      result[agentPolicy.id] = await internalAgentService.getAgentStatusForAgentPolicy(
        agentPolicy.id
      );
    }
  } catch (error) {
    if (isFleetMissingAgentHttpError(error)) {
      logger.debug('failed to get agent status for agent policy');
    } else {
      throw error;
    }
  }

  return result;
};

export const onPackagePolicyPostCreateCallback = async (
  logger: Logger,
  packagePolicy: PackagePolicy,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  return addDataViewToAllSpaces(savedObjectsClient);
};

async function addDataViewToAllSpaces(savedObjectsClient: SavedObjectsClientContract) {
  const cloudDefendDataViews = await savedObjectsClient.find<DataViewSavedObjectAttrs>({
    type: 'index-pattern',
    fields: ['title'],
    search: INTEGRATION_PACKAGE_NAME + '*',
    searchFields: ['title'],
    perPage: 100,
  });

  await Promise.all(
    cloudDefendDataViews.saved_objects.map((dataView) =>
      savedObjectsClient.updateObjectsSpaces(
        [{ id: dataView.id, type: 'index-pattern' }],
        ['*'],
        []
      )
    )
  );
}

export const getCloudDefendAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface
): Promise<AgentPolicy[]> =>
  agentPolicyService.getByIds(soClient, uniq(flatMap(packagePolicies, 'policy_ids')), {
    withPackagePolicies: true,
    ignoreMissing: true,
  });

export const getCloudDefendPackagePolicies = (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  packageName: string,
  queryParams: Partial<PoliciesQueryParams>
): Promise<ListResult<PackagePolicy>> => {
  const sortField = queryParams.sort_field?.replaceAll(POLICIES_PACKAGE_POLICY_PREFIX, '');

  return packagePolicyService.list(soClient, {
    kuery: getPackageNameQuery(packageName, queryParams.policy_name),
    page: queryParams.page,
    perPage: queryParams.per_page,
    sortField,
    sortOrder: queryParams.sort_order,
  });
};

export const getInstalledPolicyTemplates = async (
  packagePolicyClient: PackagePolicyClient,
  soClient: SavedObjectsClientContract
) => {
  try {
    // getting all installed cloud_defend package policies
    const queryResult = await packagePolicyClient.list(soClient, {
      kuery: CLOUD_DEFEND_FLEET_PACKAGE_KUERY,
      perPage: 1000,
    });

    // getting installed policy templates
    const enabledPolicyTemplates = queryResult.items
      .map((policy) => {
        return policy.inputs.find((input) => input.enabled)?.policy_template;
      })
      .filter(isPolicyTemplate);

    // removing duplicates
    return [...new Set(enabledPolicyTemplates)];
  } catch (e) {
    return [];
  }
};
