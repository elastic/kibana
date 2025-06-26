/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { getControlledArtifactCutoffDate } from '../../../common/endpoint/utils/controlled_artifact_rollout';

export const validateEndpointPackagePolicy = (inputs: NewPackagePolicyInput[]) => {
  const input = inputs.find((i) => i.type === 'endpoint');
  if (input?.config?.policy?.value?.global_manifest_version) {
    const globalManifestVersion = input.config.policy.value.global_manifest_version;

    if (globalManifestVersion !== 'latest') {
      const parsedDate = moment.utc(globalManifestVersion, 'YYYY-MM-DD', true);
      if (!parsedDate.isValid()) {
        throw createManifestVersionError(
          'Invalid date format. Use "latest" or "YYYY-MM-DD" format. UTC time.'
        );
      }

      const maxAllowedDate = getControlledArtifactCutoffDate();
      if (parsedDate.isBefore(maxAllowedDate)) {
        throw createManifestVersionError(
          'Global manifest version is too far in the past. Please use either "latest" or a date within the last 18 months. The earliest valid date is October 1, 2023, in UTC time.'
        );
      }
      const minAllowedDate = moment.utc().subtract(1, 'day');
      if (parsedDate.isAfter(minAllowedDate)) {
        throw createManifestVersionError(
          `Global manifest version cannot be in the future. Latest selectable date is ${minAllowedDate.format(
            'MMMM DD, YYYY'
          )} UTC time.`
        );
      }
    }
  }
};

const createManifestVersionError = (
  message: string
): Error & { statusCode?: number; apiPassThrough?: boolean } => {
  const manifestVersionError: Error & { statusCode?: number; apiPassThrough?: boolean } = new Error(
    message
  );
  manifestVersionError.statusCode = 400;
  manifestVersionError.apiPassThrough = true;
  return manifestVersionError;
};
