/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { AwaitedProperties } from '@kbn/utility-types';

import { ElasticAssistantRequestHandlerContext } from '../../../types';

const DEFAULT_ATTACK_DISCOVER_ALERTS_INDEX = '.alerts-security.attack.discovery.alerts' as const;
const DEFAULT_ATTACK_DISCOVER_ADHOC_ALERTS_INDEX =
  '.adhoc.alerts-security.attack.discovery.alerts' as const;

const getAllAlertsIndices = () => [
  DEFAULT_ATTACK_DISCOVER_ALERTS_INDEX,
  `.internal${DEFAULT_ATTACK_DISCOVER_ALERTS_INDEX}`,
  DEFAULT_ATTACK_DISCOVER_ADHOC_ALERTS_INDEX,
  `.internal${DEFAULT_ATTACK_DISCOVER_ADHOC_ALERTS_INDEX}`,
];

export interface AttackDiscoveryAlertsPrivilegesParams {
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  response: KibanaResponseFactory;
}

interface CheckPrivilegesParams extends AttackDiscoveryAlertsPrivilegesParams {
  additionalErrorMessage?: string;
  privileges: string[];
}

type PrivilegesCheckResults =
  | {
      isSuccess: true;
    }
  | {
      isSuccess: false;
      response: IKibanaResponse;
    };

const hasAttackDiscoveryAlertsPrivileges = async ({
  additionalErrorMessage,
  context,
  response,
  privileges,
}: CheckPrivilegesParams): Promise<PrivilegesCheckResults> => {
  const elasticAssistant = context.elasticAssistant;
  const spaceId = (await elasticAssistant).getSpaceId();

  const allAlertsIndices = getAllAlertsIndices();
  const indexPrivileges = allAlertsIndices.reduce((acc, value) => {
    acc[`${value}-${spaceId}`] = privileges;
    return acc;
  }, {} as Record<string, string[]>);

  const { hasAllRequested } = await elasticAssistant.checkPrivileges().atSpace(spaceId, {
    elasticsearch: { index: indexPrivileges, cluster: [] },
  });

  if (!hasAllRequested) {
    return {
      isSuccess: false,
      response: response.forbidden({
        body: {
          message: `Missing [${privileges.join(', ')}] privileges for the [${allAlertsIndices.join(
            ', '
          )}] indices.${additionalErrorMessage ? ` ${additionalErrorMessage}` : ''}`,
        },
      }),
    };
  }
  return { isSuccess: true };
};

export const hasReadAttackDiscoveryAlertsPrivileges = async ({
  context,
  response,
}: AttackDiscoveryAlertsPrivilegesParams): Promise<PrivilegesCheckResults> => {
  const privileges = ['read', 'view_index_metadata'];
  return hasAttackDiscoveryAlertsPrivileges({
    additionalErrorMessage: 'Without these privileges you cannot read the Attack Discovery alerts.',
    context,
    response,
    privileges,
  });
};

export const hasReadWriteAttackDiscoveryAlertsPrivileges = async ({
  context,
  response,
}: AttackDiscoveryAlertsPrivilegesParams): Promise<PrivilegesCheckResults> => {
  const privileges = ['read', 'view_index_metadata', 'write', 'maintenance'];
  return hasAttackDiscoveryAlertsPrivileges({
    additionalErrorMessage:
      'Without these privileges you cannot create, read, update or delete the Attack Discovery alerts.',
    context,
    response,
    privileges,
  });
};
