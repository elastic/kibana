/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import type { Logger } from '@kbn/core/server';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../common/endpoint/service/artifacts/constants';

/**
 * Removes policy from artifacts
 */
export const removePolicyFromArtifacts = async (
  exceptionsClient: ExceptionListClient,
  policy: Parameters<PostPackagePolicyPostDeleteCallback>[0][0],
  _logger: Logger
) => {
  const logger = _logger.get('removePolicyFromArtifacts');

  logger.debug(`Finding all artifacts referencing endpoint policy [${policy.id}]`);

  let page = 1;

  const findArtifactsByPolicy = (currentPage: number) => {
    return exceptionsClient.findExceptionListsItem({
      listId: ALL_ENDPOINT_ARTIFACT_LIST_IDS as string[],
      filter: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(
        () => `exception-list-agnostic.attributes.tags:"policy:${policy.id}"`
      ),
      namespaceType: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(() => 'agnostic'),
      page: currentPage,
      perPage: 50,
      sortField: undefined,
      sortOrder: undefined,
    });
  };

  let findResponse = await findArtifactsByPolicy(page);

  if (!findResponse) {
    return;
  }
  const artifacts = findResponse.data;

  while (findResponse && (artifacts.length < findResponse.total || findResponse.data.length)) {
    page += 1;
    findResponse = await findArtifactsByPolicy(page);
    if (findResponse) {
      artifacts.push(...findResponse.data);
    }
  }

  logger.debug(
    `Found [${artifacts.length}] artifacts that need to be updated to remove reference to policy [${policy.id}]`
  );

  const updateErrors: string[] = [];

  await pMap(
    artifacts,
    (artifact) =>
      exceptionsClient
        .updateExceptionListItem({
          ...artifact,
          itemId: artifact.item_id,
          namespaceType: artifact.namespace_type,
          osTypes: artifact.os_types,
          tags: artifact.tags.filter((currentPolicy) => currentPolicy !== `policy:${policy.id}`),
          expireTime: artifact.expire_time,
        })
        .catch((error) => {
          updateErrors.push(
            `Attempt to update artifact [${artifact.list_id}][${artifact.item_id}] returned error: [${error.message}]\n${error.stack}`
          );
        }),
    {
      /** Number of concurrent executions till the end of the artifacts array */
      concurrency: 5,
      /** When set to false, instead of stopping when a promise rejects, it will wait for all the promises to
       * settle and then reject with an aggregated error containing all the errors from the rejected promises. */
      stopOnError: false,
    }
  );

  if (updateErrors.length > 0) {
    logger.error(updateErrors.join('\n\n'));
  }

  logger.debug(`Done with artifact updates`);
};
