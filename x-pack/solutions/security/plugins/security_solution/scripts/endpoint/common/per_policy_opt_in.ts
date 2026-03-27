/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SavedObjectsFindResult } from '@kbn/core/server';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../common/endpoint/constants';
import type {
  OptInStatusMetadata,
  ReferenceDataSavedObject,
} from '../../../server/endpoint/lib/reference_data';
import {
  REF_DATA_KEYS,
  REFERENCE_DATA_SAVED_OBJECT_TYPE,
} from '../../../server/endpoint/lib/reference_data';

export const findEndpointExceptionsPerPolicyOptInSO = async (
  kbnClient: KbnClient
): Promise<SavedObjectsFindResult<ReferenceDataSavedObject<OptInStatusMetadata>> | undefined> => {
  const foundReferenceDataSavedObjects = await kbnClient.savedObjects.find<
    ReferenceDataSavedObject<OptInStatusMetadata>
  >({
    type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
  });

  return foundReferenceDataSavedObjects.saved_objects.find(
    (obj) => obj.id === REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
  );
};

export const deleteEndpointExceptionsPerPolicyOptInSO = async (
  kbnClient: KbnClient
): Promise<void> => {
  const foundSO = await findEndpointExceptionsPerPolicyOptInSO(kbnClient);

  if (foundSO) {
    await kbnClient.savedObjects.delete({
      type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
      id: foundSO.id,
    });
  }
};

export const optInForPerPolicyEndpointExceptions = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
    headers: {
      'x-elastic-internal-origin': 'kibana',
      'Elastic-Api-Version': '1',
      'kbn-xsrf': 'true',
    },
  });
};

export const disablePerPolicyEndpointExceptions = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.savedObjects.create({
    type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
    id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
    attributes: {
      id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
      owner: 'EDR',
      type: 'OPT_IN_STATUS',
      metadata: { status: false, reason: undefined },
    } as ReferenceDataSavedObject<OptInStatusMetadata>,
    overwrite: true,
  });
};
