/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { REVISION_SIZE_LIMIT } from '../knowledge_indicator_client/revision_reader';
import { createKnowledgeIndicatorReader } from './knowledge_indicator_reader';

const createReader = () => {
  const getQueryLinks = jest.fn().mockResolvedValue([]);
  const getFeatures = jest.fn().mockResolvedValue({ hits: [] });
  const reader = createKnowledgeIndicatorReader({
    indicatorReader: { getQueryLinks, getFeatures },
  });
  return { reader, getQueryLinks, getFeatures };
};

describe('createKnowledgeIndicatorReader', () => {
  describe('listQueries', () => {
    it('reads the rule-backed and unbacked queries of the given sources', async () => {
      const { reader, getQueryLinks } = createReader();

      await reader.listQueries({ sourceIds: ['logs-app'] });

      expect(getQueryLinks).toHaveBeenCalledWith(['logs-app'], { ruleUnbacked: 'include' });
    });

    it('returns no queries without reading when no sources are given', async () => {
      const { reader, getQueryLinks } = createReader();

      await expect(reader.listQueries({ sourceIds: [] })).resolves.toEqual([]);
      expect(getQueryLinks).not.toHaveBeenCalled();
    });

    it('throws rather than return a list cut at the read limit', async () => {
      const { reader, getQueryLinks } = createReader();
      getQueryLinks.mockResolvedValue(new Array<QueryLink>(REVISION_SIZE_LIMIT));

      await expect(reader.listQueries({ sourceIds: ['logs-app'] })).rejects.toThrow(
        `${REVISION_SIZE_LIMIT} or more`
      );
    });
  });

  describe('listFeatures', () => {
    it('reads the features of the given sources and types', async () => {
      const { reader, getFeatures } = createReader();

      await reader.listFeatures({ sourceIds: ['logs-app'], types: ['entity'] });

      expect(getFeatures).toHaveBeenCalledWith(['logs-app'], { type: ['entity'] });
    });

    it('returns no features without reading when no types are given', async () => {
      const { reader, getFeatures } = createReader();

      await expect(reader.listFeatures({ sourceIds: ['logs-app'], types: [] })).resolves.toEqual(
        []
      );
      expect(getFeatures).not.toHaveBeenCalled();
    });
  });
});
