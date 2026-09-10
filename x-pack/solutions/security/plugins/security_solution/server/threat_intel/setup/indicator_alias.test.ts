/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { THREAT_INTEL_INDICATORS_INDEX } from '../../../common/threat_intel';
import { ensureIndicatorAliasForSpace, indicatorAliasForSpace } from './indicator_alias';

// Derived rather than hardcoded so the suite follows the constant. The one property
// worth pinning independently is asserted below: the name must stay outside `.kibana`.
const INDEX = THREAT_INTEL_INDICATORS_INDEX;

const setup = (getAliasResponse: unknown = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getAlias.mockResolvedValue(getAliasResponse as never);
  return { esClient, logger: loggingSystemMock.createLogger() };
};

const putArgs = (esClient: ReturnType<typeof setup>['esClient']) =>
  esClient.indices.putAlias.mock.calls[0][0] as { filter: { bool: { filter: unknown[] } } };

describe('indicatorAliasForSpace', () => {
  it('names the alias after the index and space', () => {
    expect(indicatorAliasForSpace('marketing')).toBe(`${INDEX}-marketing`);
  });

  // An Indicator Match rule reads this alias as its own API key, and `viewer` grants
  // nothing under `.kibana`. Elasticsearch's reserved roles grant
  // `.threat-intel-indicators-*` instead, so a name that drifted back under `.kibana`
  // would be unreadable by every non-superuser and the rule would silently match
  // nothing. Nothing else in this suite would catch that.
  it('keeps the alias outside the .kibana namespace so it can be granted', () => {
    expect(indicatorAliasForSpace('default').startsWith('.kibana')).toBe(false);
  });

  // Kibana permits a space id starting with `-` or `_`, which Elasticsearch rejects
  // at the start of an alias name. The prefix keeps it out of that position.
  it('never puts the space id at the start of the name', () => {
    expect(indicatorAliasForSpace('-odd')).toBe(`${INDEX}--odd`);
    expect(indicatorAliasForSpace('-odd').startsWith('-')).toBe(false);
  });
});

describe('ensureIndicatorAliasForSpace', () => {
  it('creates the alias when it is absent', async () => {
    const { esClient, logger } = setup({});

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putAlias.mock.calls[0][0]).toMatchObject({
      index: INDEX,
      name: `${INDEX}-marketing`,
    });
  });

  // Elasticsearch applies no Spaces filtering, so without this term a rule in one
  // space matches another space's private intelligence.
  it('scopes the filter to the space plus the global sentinel', async () => {
    const { esClient, logger } = setup({});

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(putArgs(esClient).filter.bool.filter).toContainEqual({
      terms: { space_id: ['marketing', '*'] },
    });
  });

  // The index stores the full candidate set including `uncertain`, so the alias is
  // what keeps a rule that alerts away from low-confidence rows.
  it('restricts the filter to the precision tiers', async () => {
    const { esClient, logger } = setup({});

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(putArgs(esClient).filter.bool.filter).toContainEqual({
      terms: { ioc_tier: ['discriminating', 'contextual'] },
    });
  });

  // putAlias is a master-node cluster-state update and this runs from request
  // paths, so an unchanged alias must not cost a write.
  it('does not write when the alias already matches', async () => {
    const { esClient, logger } = setup({});
    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });
    const installed = putArgs(esClient).filter;
    esClient.indices.putAlias.mockClear();

    const { esClient: second, logger: secondLogger } = setup({
      [INDEX]: { aliases: { [`${INDEX}-marketing`]: { filter: installed } } },
    });
    await ensureIndicatorAliasForSpace({
      esClient: second,
      spaceId: 'marketing',
      logger: secondLogger,
    });

    expect(second.indices.putAlias).not.toHaveBeenCalled();
  });

  // Elasticsearch re-serializes a stored filter, so the returned form can differ from
  // what was sent by clause order, key order, or added defaults. Comparing by exact
  // string would never match, and since this runs on request paths that means a
  // master-node cluster-state write on every call.
  it.each([
    [
      'clause order reversed',
      {
        bool: {
          filter: [
            { terms: { ioc_tier: ['discriminating', 'contextual'] } },
            { terms: { space_id: ['marketing', '*'] } },
          ],
        },
      },
    ],
    [
      'boost added by Elasticsearch',
      {
        bool: {
          filter: [
            { terms: { space_id: ['marketing', '*'], boost: 1.0 } },
            { terms: { ioc_tier: ['discriminating', 'contextual'], boost: 1.0 } },
          ],
        },
      },
    ],
    [
      'values in a different order',
      {
        bool: {
          filter: [
            { terms: { space_id: ['*', 'marketing'] } },
            { terms: { ioc_tier: ['contextual', 'discriminating'] } },
          ],
        },
      },
    ],
  ])('does not rewrite when the stored filter differs only by %s', async (_label, stored) => {
    const { esClient, logger } = setup({
      [INDEX]: { aliases: { [`${INDEX}-marketing`]: { filter: stored } } },
    });

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).not.toHaveBeenCalled();
  });

  it('does rewrite when the space set genuinely differs', async () => {
    const { esClient, logger } = setup({
      [INDEX]: {
        aliases: {
          [`${INDEX}-marketing`]: {
            filter: {
              bool: {
                filter: [
                  { terms: { space_id: ['marketing'] } },
                  { terms: { ioc_tier: ['discriminating', 'contextual'] } },
                ],
              },
            },
          },
        },
      },
    });

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(1);
  });

  it('does rewrite when the tier set genuinely differs', async () => {
    const { esClient, logger } = setup({
      [INDEX]: {
        aliases: {
          [`${INDEX}-marketing`]: {
            filter: {
              bool: {
                filter: [
                  { terms: { space_id: ['marketing', '*'] } },
                  { terms: { ioc_tier: ['discriminating', 'contextual', 'uncertain'] } },
                ],
              },
            },
          },
        },
      },
    });

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(1);
  });

  // The alias exists to enforce exactly the space and tier scope. An extra clause narrows
  // it further than intended, so a stored filter carrying one must be repaired, not accepted.
  it('does rewrite when the filter carries an extra clause', async () => {
    const { esClient, logger } = setup({
      [INDEX]: {
        aliases: {
          [`${INDEX}-marketing`]: {
            filter: {
              bool: {
                filter: [
                  { terms: { space_id: ['marketing', '*'] } },
                  { terms: { ioc_tier: ['discriminating', 'contextual'] } },
                  { terms: { source_type: ['rss'] } },
                ],
              },
            },
          },
        },
      },
    });

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(1);
  });

  // Two `space_id` clauses can disagree; the first must not be trusted while a later one is
  // ignored. A duplicate is drift, so it must be repaired.
  it('does rewrite when a space_id clause is duplicated', async () => {
    const { esClient, logger } = setup({
      [INDEX]: {
        aliases: {
          [`${INDEX}-marketing`]: {
            filter: {
              bool: {
                filter: [
                  { terms: { space_id: ['marketing', '*'] } },
                  { terms: { space_id: ['other'] } },
                ],
              },
            },
          },
        },
      },
    });

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(1);
  });

  it('repairs an alias whose filter has drifted', async () => {
    const { esClient, logger } = setup({
      [INDEX]: {
        aliases: {
          [`${INDEX}-marketing`]: {
            filter: { bool: { filter: [{ terms: { space_id: ['*'] } }] } },
          },
        },
      },
    });

    await ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(1);
  });

  // A missing alias surfaces to the consumer as index-not-found, which is safe and
  // visible. Throwing would instead take down whichever caller was setting it up.
  it('logs and returns when Elasticsearch rejects the write', async () => {
    const { esClient, logger } = setup({});
    esClient.indices.putAlias.mockRejectedValue(new Error('no perms'));

    await expect(
      ensureIndicatorAliasForSpace({ esClient, spaceId: 'marketing', logger })
    ).resolves.toBeUndefined();

    expect(logger.get('indicator-alias').error).toHaveBeenCalledWith(
      expect.stringContaining('Do not point a detection rule at the raw index')
    );
  });
});
