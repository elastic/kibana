/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import supertest from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

interface MonitoringStats {
  last_update: string;
  status: string;
  stats: {
    timestamp: string;
    value: {
      adhoc: {
        created: {
          counter: number;
        };
        ran: {
          service_time: {
            actual: number;
            adjusted: number;
            task_counter: number;
          };
        };
      };
      recurring: {
        ran: {
          service_time: {
            actual: number;
            adjusted: number;
            task_counter: number;
          };
        };
      };
    };
  };
}

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const retry = getService('retry');
  const request = supertest(url.format(config.get('servers.kibana')));

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function getUtilizationRequest() {
    return request
      .get('/internal/task_manager/_background_task_utilization')
      .set('kbn-xsrf', 'foo');
  }

  function getUtilization(): Promise<MonitoringStats> {
    return getUtilizationRequest()
      .expect(200)
      .then((response) => response.body);
  }

  function getBackgroundTaskUtilization(): Promise<MonitoringStats> {
    return retry.try(async () => {
      const utilization = await getUtilization();

      if (utilization.stats) {
        return utilization;
      }

      await delay(500);
      throw new Error('Stats have not run yet');
    });
  }

  describe('background task utilization', () => {
    it('should return the task manager background task utilization for recurring stats', async () => {
      const {
        value: {
          recurring: { ran },
        },
      } = (await getBackgroundTaskUtilization()).stats;
      const serviceTime = ran.service_time;
      expect(typeof serviceTime.actual).to.eql('number');
      expect(typeof serviceTime.adjusted).to.eql('number');
      expect(typeof serviceTime.task_counter).to.eql('number');
    });

    it('should return the task manager background task utilization for adhoc stats', async () => {
      const {
        value: {
          adhoc: { created, ran },
        },
      } = (await getBackgroundTaskUtilization()).stats;
      const serviceTime = ran.service_time;
      expect(typeof created.counter).to.eql('number');

      expect(typeof serviceTime.actual).to.eql('number');
      expect(typeof serviceTime.adjusted).to.eql('number');
      expect(typeof serviceTime.task_counter).to.eql('number');
    });
  });
}
