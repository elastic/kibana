/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ISearchRequestParams } from '@kbn/search-types';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { OSQUERY_ACTIONS_INDEX } from '@kbn/osquery-plugin/common/constants';
import type { EndpointAuthz } from '../../../../../../common/endpoint/types/authz';
import type { ActionRequestOptions } from '../../../../../../common/search_strategy/endpoint/response_actions';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../../common/endpoint/constants';
import { prefixIndexPatternsWithCcs } from '../../../../../endpoint/utils/ccs_utils';
import { buildOriginSpaceIdFilter } from '../../../../../endpoint/services/actions/utils/build_origin_space_id_filter';

const EndpointFieldsLimited = [
  'EndpointActions.action_id',
  'EndpointActions.input_type',
  'EndpointActions.expiration',
  'EndpointActions.data.command',
];

/**
 * The alert ids this query is keyed on are caller-supplied, so a fanned-out read needs its own space
 * bound. Defend and Osquery stamp the space on different fields, and this query spans both indices,
 * so each document shape is bounded by the field it actually carries.
 *
 * The Osquery half mirrors `buildSpaceIdFilter` in
 * `x-pack/platform/plugins/shared/osquery/server/utils/build_space_id_filter.ts`, which treats a
 * missing `space_id` as the default space because Osquery documents predating space stamping carry
 * no field at all. Keep the two in step: importing across plugins is not an option here. The
 * allowance is narrowed to documents that are not Defend's, whose own missing-field case is
 * deliberately excluded once the read fans out.
 */
const buildSpaceFilter = (spaceId: string): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      buildOriginSpaceIdFilter(spaceId, { matchMissingOriginSpaceId: false }),
      { term: { space_id: spaceId } },
      ...(spaceId === DEFAULT_SPACE_ID
        ? [
            {
              bool: {
                must_not: [
                  { exists: { field: 'space_id' } },
                  { exists: { field: 'EndpointActions.action_id' } },
                ],
              },
            },
          ]
        : []),
    ],
    minimum_should_match: 1,
  },
});

export const buildResponseActionsQuery = (
  { alertIds, sort, ccsEnabled, spaceId }: ActionRequestOptions,
  authz: EndpointAuthz | void
): ISearchRequestParams => {
  const fields = authz?.canAccessEndpointActionsLogManagement
    ? [{ field: '*' }, { field: 'EndpointActions.*', include_unmapped: true }]
    : ['@timestamp', 'action_id', 'input_type', ...EndpointFieldsLimited];

  const dslQuery = {
    allow_no_indices: true,
    index: prefixIndexPatternsWithCcs(
      [ENDPOINT_ACTIONS_INDEX, OSQUERY_ACTIONS_INDEX].join(','),
      ccsEnabled ?? false
    ).split(','),
    ignore_unavailable: true,
    fields,
    _source: false,
    query: {
      bool: {
        minimum_should_match: 2,
        should: [
          { term: { type: 'INPUT_ACTION' } },
          { terms: { alert_ids: alertIds } },
          {
            terms: { 'data.alert_id': alertIds },
          },
        ] as estypes.QueryDslQueryContainer[],
        ...(spaceId ? { filter: [buildSpaceFilter(spaceId)] } : {}),
      },
    },
    sort: [
      {
        [sort.field]: {
          order: sort.order,
        },
      },
    ],
  };

  return dslQuery;
};
