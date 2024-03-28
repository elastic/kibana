/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRulesAndTimelines,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless @skipInQA get_prebuilt_timelines_status', () => {
    beforeEach(async () => {
      await deleteAllTimelines(es, log);
    });

    it('should return the number of timeline templates available to install', async () => {
      const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);

      expect(body).toMatchObject({
        timelines_installed: 0,
        timelines_not_installed: expect.any(Number),
        timelines_not_updated: 0,
      });
      expect(body.timelines_not_installed).toBeGreaterThan(0);
    });

    it('should return the number of installed timeline templates after installing them', async () => {
      await installPrebuiltRulesAndTimelines(es, supertest);

      const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
      expect(body).toMatchObject({
        timelines_installed: expect.any(Number),
        timelines_not_installed: 0,
        timelines_not_updated: 0,
      });

      expect(body.timelines_installed).toBeGreaterThan(0);
    });
  });
};
