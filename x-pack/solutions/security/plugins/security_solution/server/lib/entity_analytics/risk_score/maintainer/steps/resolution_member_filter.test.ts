/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  getResolutionPageMemberFilter,
  MAX_RESOLUTION_PAGE_MEMBERS,
} from './resolution_member_filter';

describe('getResolutionPageMemberFilter', () => {
  it("keeps the members' stamped alerts and every alert without this type's stamp", () => {
    expect(getResolutionPageMemberFilter(EntityType.host, ['host:target', 'host:alias'])).toEqual({
      bool: {
        should: [
          { terms: { 'kibana.alert.entity.id': ['host:target', 'host:alias'] } },
          {
            bool: {
              filter: [
                euid.dsl.getEuidDocumentsContainsIdFilter(
                  getBuiltInEntityDefinition(EntityType.host)
                ),
              ],
              // Per type: an alert stamped for users only can still belong to a host group.
              must_not: [{ prefix: { 'kibana.alert.entity.id': 'host:' } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('builds nothing for a page without members', () => {
    expect(getResolutionPageMemberFilter(EntityType.user, [])).toBeUndefined();
  });

  it('builds nothing when the members exceed what a terms query accepts', () => {
    const memberIds = Array.from(
      { length: MAX_RESOLUTION_PAGE_MEMBERS + 1 },
      (_, i) => `user:member-${i}`
    );

    expect(getResolutionPageMemberFilter(EntityType.user, memberIds)).toBeUndefined();
    expect(
      getResolutionPageMemberFilter(
        EntityType.user,
        memberIds.slice(0, MAX_RESOLUTION_PAGE_MEMBERS)
      )
    ).toBeDefined();
  });
});
