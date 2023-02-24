/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteAllTimelines,
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRulesAndTimelines,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_prebuilt_timelines_status', () => {
    beforeEach(async () => {
      await deleteAllTimelines(es);
    });

    it('should return the number of timeline templates available to install', async () => {
      const body = await getPrebuiltRulesAndTimelinesStatus(supertest);

      expect(body).toMatchObject({
        timelines_installed: 0,
        timelines_not_installed: expect.any(Number),
        timelines_not_updated: 0,
      });
      expect(body.timelines_not_installed).toBeGreaterThan(0);
    });

    it('should return the number of installed timeline templates after installing them', async () => {
      await installPrebuiltRulesAndTimelines(supertest);

      const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(body).toMatchObject({
        timelines_installed: expect.any(Number),
        timelines_not_installed: 0,
        timelines_not_updated: 0,
      });

      expect(body.timelines_installed).toBeGreaterThan(0);
    });
  });
};
