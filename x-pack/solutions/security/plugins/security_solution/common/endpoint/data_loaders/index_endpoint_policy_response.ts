/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HostPolicyResponse } from '../types';
import { wrapErrorAndRejectPromise } from './utils';
import { POLICY_RESPONSE_INDEX } from '../constants';

export interface IndexedEndpointPolicyResponse {
  policyResponses: HostPolicyResponse[];
  /** Index (actual, not an alias) where document was created */
  index: string;
  /** The document's id in ES */
  id: string;
}

export const indexEndpointPolicyResponse = async (
  esClient: Client,
  policyResponse: HostPolicyResponse
): Promise<IndexedEndpointPolicyResponse> => {
  const { _index: index, _id: id } = await esClient
    .index({
      index: POLICY_RESPONSE_INDEX,
      body: policyResponse,
      op_type: 'create',
      refresh: 'wait_for',
    })
    .catch(wrapErrorAndRejectPromise);

  const response: IndexedEndpointPolicyResponse = {
    policyResponses: [policyResponse],
    index,
    id,
  };

  return response;
};

export const deleteIndexedEndpointPolicyResponse = async (
  esClient: Client,
  indexedData: IndexedEndpointPolicyResponse
) => {
  await esClient
    .delete(
      {
        index: indexedData.index,
        id: indexedData.id,
        refresh: 'wait_for',
      },
      {
        ignore: [404],
      }
    )
    .catch(wrapErrorAndRejectPromise);
};
