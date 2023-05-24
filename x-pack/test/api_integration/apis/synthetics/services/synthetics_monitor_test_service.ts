/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { KibanaSupertestProvider } from '../../../../../../test/api_integration/services/supertest';

export class SyntheticsMonitorTestService {
  private supertest: ReturnType<typeof KibanaSupertestProvider>;

  constructor(getService: FtrProviderContext['getService']) {
    this.supertest = getService('supertest');
  }

  async addProjectMonitors(project: string, monitors: any) {
    const { body } = await this.supertest
      .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
      .set('kbn-xsrf', 'true')
      .send({ monitors })
      .expect(200);
    return body;
  }

  async deleteMonitorByJourney(
    projectMonitors: any,
    journeyId: string,
    projectId: string,
    space: string = 'default'
  ) {
    try {
      const response = await this.supertest
        .get(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}`)
        .query({
          filter: `${syntheticsMonitorType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorType}.attributes.project_id: "${projectId}"`,
        })
        .set('kbn-xsrf', 'true')
        .expect(200);
      const { monitors } = response.body;
      if (monitors[0]?.id) {
        await this.supertest
          .delete(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}/${monitors[0].id}`)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }
}
