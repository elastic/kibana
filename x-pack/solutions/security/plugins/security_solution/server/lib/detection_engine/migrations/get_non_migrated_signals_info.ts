/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { IndexVersionsByIndex } from './get_index_versions_by_index';
import { getIndexVersionsByIndex } from './get_index_versions_by_index';
import {
  getSignalVersionsByIndex,
  type SignalVersionsByIndex,
} from './get_signal_versions_by_index';
import { isOutdated as getIsOutdated, signalsAreOutdated } from './helpers';
import { getLatestIndexTemplateVersion } from './get_latest_index_template_version';
import { getIndexAliasPerSpace } from './get_index_alias_per_space';

const REINDEXED_PREFIX = '.reindexed-v8-';

export const checkIfMigratedIndexOutdated = (
  indexName: string,
  indexVersionsByIndex: IndexVersionsByIndex,
  latestTemplateVersion: number
) => {
  const isIndexOutdated = getIsOutdated({
    current: indexVersionsByIndex[indexName] ?? 0,
    target: latestTemplateVersion,
  });

  if (!isIndexOutdated) {
    return false;
  }

  const nameWithoutPrefix = indexName.replace(REINDEXED_PREFIX, '.');

  const hasOutdatedMigratedIndices = Object.entries(indexVersionsByIndex).every(
    ([index, version]) => {
      if (index === indexName) {
        return true;
      }

      if (index.startsWith(nameWithoutPrefix) || index.startsWith(indexName)) {
        return getIsOutdated({ current: version ?? 0, target: latestTemplateVersion });
      }

      return true;
    }
  );

  return hasOutdatedMigratedIndices;
};

interface OutdatedSpaces {
  isMigrationRequired: boolean;
  spaces: string[];
  indices: string[];
}

/**
 * gets lists of spaces and non-migrated signal indices
 */
export const getNonMigratedSignalsInfo = async ({
  esClient,
  signalsIndex,
  logger,
}: {
  esClient: ElasticsearchClient;
  signalsIndex: string;
  logger: Logger;
}): Promise<OutdatedSpaces> => {
  const signalsAliasAllSpaces = `${signalsIndex}-*`;

  try {
    const latestTemplateVersion = await getLatestIndexTemplateVersion({
      esClient,
      name: signalsAliasAllSpaces,
    });
    const indexAliasesMap = await getIndexAliasPerSpace({
      esClient,
      signalsAliasAllSpaces,
      signalsIndex,
    });

    const indices = Object.keys(indexAliasesMap);

    if (indices.length === 0) {
      return {
        isMigrationRequired: false,
        spaces: [],
        indices: [],
      };
    }

    let indexVersionsByIndex: IndexVersionsByIndex = {};
    try {
      indexVersionsByIndex = await getIndexVersionsByIndex({
        esClient,
        index: indices,
      });
    } catch (e) {
      logger.debug(
        `Getting information about legacy siem signals index version failed:"${e?.message}"`
      );
    }

    let signalVersionsByIndex: SignalVersionsByIndex = {};
    try {
      signalVersionsByIndex = await getSignalVersionsByIndex({
        esClient,
        index: indices,
      });
    } catch (e) {
      logger.debug(`Getting information about legacy siem signals versions failed:"${e?.message}"`);
    }

    const outdatedIndices = indices.reduce<Array<{ indexName: string; space: string }>>(
      (acc, indexName) => {
        const version = indexVersionsByIndex[indexName] ?? 0;
        const signalVersions = signalVersionsByIndex[indexName] ?? [];

        // filter out migrated from 7.x to 8 indices
        if (
          indexName.startsWith(REINDEXED_PREFIX) &&
          !checkIfMigratedIndexOutdated(indexName, indexVersionsByIndex, latestTemplateVersion)
        ) {
          return acc;
        }

        const isOutdated =
          getIsOutdated({ current: version, target: latestTemplateVersion }) ||
          signalsAreOutdated({ signalVersions, target: latestTemplateVersion });

        if (isOutdated) {
          acc.push({
            indexName,
            space: indexAliasesMap[indexName].space,
          });
        }

        return acc;
      },
      []
    );

    const outdatedIndexNames = outdatedIndices.map((outdatedIndex) => outdatedIndex.indexName);

    // remove duplicated spaces
    const spaces = [...new Set<string>(outdatedIndices.map((indexStatus) => indexStatus.space))];
    const isMigrationRequired = outdatedIndices.length > 0;

    logger.debug(
      isMigrationRequired
        ? `Legacy siem signals indices require migration: "${outdatedIndexNames.join(
            ', '
          )}" in "${spaces.join(', ')}" spaces`
        : 'No legacy siem indices require migration'
    );

    return {
      isMigrationRequired,
      spaces,
      indices: outdatedIndexNames,
    };
  } catch (e) {
    logger.debug(`Getting information about legacy siem signals failed:"${e?.message}"`);
    return {
      isMigrationRequired: false,
      spaces: [],
      indices: [],
    };
  }
};
