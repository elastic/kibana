/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ProcessListAPIChartRequestRT,
  ProcessListAPIChartResponseRT,
} from '@kbn/infra-plugin/common/http_api/host_details/process_list';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { SupertestWithRoleScopeType } from '../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');

  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('API /metrics/process_list/chart', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      await esArchiver.load(
        'x-pack/test/functional/es_archives/infra/8.0.0/metrics_hosts_processes'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/infra/8.0.0/metrics_hosts_processes'
      );
      await supertestWithAdminScope.destroy();
    });

    it('works', async () => {
      const response = await supertestWithAdminScope
        .post('/api/metrics/process_list/chart')
        .send(
          ProcessListAPIChartRequestRT.encode({
            hostTerm: {
              'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw',
            },
            indexPattern: 'metrics-*,metricbeat-*',
            to: 1680027660000,
            command:
              '/System/Library/CoreServices/NotificationCenter.app/Contents/MacOS/NotificationCenter',
          })
        )
        .expect(200);

      const { cpu, memory } = decodeOrThrow(ProcessListAPIChartResponseRT)(response.body);

      expect(cpu.rows.length).to.be(16);
      expect(memory.rows.length).to.be(16);
    });
  });
}
