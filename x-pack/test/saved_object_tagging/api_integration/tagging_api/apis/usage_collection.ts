/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const usageAPI = getService('usageAPI');

  describe('saved_object_tagging usage collector data', () => {
    beforeEach(async () => {
      await esArchiver.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/usage_collection'
      );
    });

    afterEach(async () => {
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/usage_collection'
      );
    });

    /*
     * Dataset description:
     *
     * 5 tags: tag-1 tag-2 tag-3 tag-4 ununsed-tag
     * 3 dashboard:
     *   - dash-1: ref to tag-1 + tag-2
     *   - dash-2: ref to tag-2 + tag 4
     *   - dash-3: no ref to any tag
     * 3 visualization:
     *   - vis-1: ref to tag-1
     *   - vis-2: ref to tag-1 + tag-3
     *   - vis-3: ref to tag-3
     */
    it('collects the expected data', async () => {
      const [{ stats: telemetryStats }] = (await usageAPI.getTelemetryStats({
        unencrypted: true,
        refreshCache: true,
      })) as any;

      const taggingStats = telemetryStats.stack_stats.kibana.plugins.saved_objects_tagging;
      expect(taggingStats).to.eql({
        usedTags: 4,
        taggedObjects: 5,
        types: {
          dashboard: {
            taggedObjects: 2,
            usedTags: 3,
          },
          visualization: {
            taggedObjects: 3,
            usedTags: 2,
          },
        },
      });
    });
  });
}
