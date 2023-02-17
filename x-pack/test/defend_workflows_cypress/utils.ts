/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import semver from 'semver';
import { filter } from 'lodash';
import { KbnClient } from '@kbn/test';

/**
 * Returns the Agent version that is available for install (will check `artifacts-api.elastic.co/v1/versions`)
 * that is equal to or less than `maxVersion`.
 * @param maxVersion
 */

export const getLatestAvailableAgentVersion = async (kbnClient: KbnClient): Promise<string> => {
  const kbnStatus = await kbnClient.status.get();
  const agentVersions = await axios
    .get('https://artifacts-api.elastic.co/v1/versions')
    .then((response) =>
      filter(response.data.versions, (versionString) => !versionString.includes('SNAPSHOT'))
    );

  let version =
    semver.maxSatisfying(agentVersions, `<=${kbnStatus.version.number}`) ??
    kbnStatus.version.number;

  // Add `-SNAPSHOT` if version indicates it was from a snapshot or the build hash starts
  // with `xxxxxxxxx` (value that seems to be present when running kibana from source)
  if (
    kbnStatus.version.build_snapshot ||
    kbnStatus.version.build_hash.startsWith('XXXXXXXXXXXXXXX')
  ) {
    version += '-SNAPSHOT';
  }

  return version;
};
