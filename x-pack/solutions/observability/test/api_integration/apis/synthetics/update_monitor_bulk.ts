/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import type { HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import {
  PrivateLocationTestService,
  cleanSyntheticsTestData,
} from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

/**
 * api_integration coverage for `PATCH /internal/synthetics/monitors/_bulk_update`.
 *
 * The unit tests in `update_monitor_bulk.test.ts` and
 * `update_monitor_api.test.ts` cover the merge / classification logic with
 * mocks. Here we exercise the full stack:
 *   - real Encrypted Saved Objects round-trip (the AAD regression test
 *     reads the monitor back via the GET endpoint, which decrypts; if
 *     `mergeSourceMonitor` ever stops carrying prev AAD attrs this test
 *     turns the GET into a 500)
 *   - real Fleet integration for private-location monitors
 *   - real project-monitor rejection path through the registered route
 */
export default function ({ getService }: FtrProviderContext) {
  describe('UpdateMonitorBulkAPI', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let httpMonitorJson: HTTPFields;
    let privateLocationId: string;

    const bulkUpdate = (body: { ids: string[]; attributes: Record<string, unknown> }) =>
      supertest
        .patch(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_UPDATE)
        .set('kbn-xsrf', 'true')
        .send(body);

    const createUiMonitor = async (overrides: Partial<HTTPFields> = {}) => {
      const monitor = {
        ...httpMonitorJson,
        name: `bulk-patch-${uuidv4()}`,
        ...overrides,
      };
      const { rawBody } = await monitorTestService.createMonitor({ monitor });
      return rawBody;
    };

    before(async () => {
      await cleanSyntheticsTestData(kibanaServer);
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const loc = await testPrivateLocations.createPrivateLocation();
      privateLocationId = loc.id;

      httpMonitorJson = getFixtureJson('http_monitor');
    });

    after(async () => {
      await cleanSyntheticsTestData(kibanaServer);
    });

    describe('happy path', () => {
      it('partially patches a single monitor with a public location', async () => {
        const monitor = await createUiMonitor({ enabled: true } as Partial<HTTPFields>);

        const res = await bulkUpdate({
          ids: [monitor.config_id],
          attributes: { enabled: false },
        }).expect(200);

        expect(res.body.result).to.eql([{ id: monitor.config_id, updated: true }]);
        expect(res.body.errors).to.be(undefined);

        const { body: refreshed } = await monitorTestService.getMonitor(monitor.config_id);
        expect(refreshed.enabled).to.be(false);
        // Untouched AAD-bound fields must round-trip unchanged.
        expect(refreshed.name).to.eql(monitor.name);
        expect(refreshed.tags).to.eql(monitor.tags);
        expect(refreshed.schedule).to.eql(monitor.schedule);
      });

      it('partially patches a monitor with a private location', async () => {
        const monitor = await createUiMonitor({
          locations: [
            { id: privateLocationId, label: 'Test private location 0', isServiceManaged: false },
          ],
        } as Partial<HTTPFields>);

        const res = await bulkUpdate({
          ids: [monitor.config_id],
          attributes: { enabled: false },
        }).expect(200);

        expect(res.body.result).to.eql([{ id: monitor.config_id, updated: true }]);

        const { body: refreshed } = await monitorTestService.getMonitor(monitor.config_id);
        expect(refreshed.enabled).to.be(false);
        expect(refreshed.locations[0].id).to.eql(privateLocationId);
      });

      it('patches multiple monitors in one request', async () => {
        const m1 = await createUiMonitor();
        const m2 = await createUiMonitor();

        const res = await bulkUpdate({
          ids: [m1.config_id, m2.config_id],
          attributes: { tags: ['bulk-patched'] },
        }).expect(200);

        expect(res.body.result).to.eql([
          { id: m1.config_id, updated: true },
          { id: m2.config_id, updated: true },
        ]);

        const refreshedA = await monitorTestService.getMonitor(m1.config_id);
        const refreshedB = await monitorTestService.getMonitor(m2.config_id);
        expect(refreshedA.body.tags).to.eql(['bulk-patched']);
        expect(refreshedB.body.tags).to.eql(['bulk-patched']);
      });
    });

    describe('AAD regression (decrypt-merge-encrypt safety)', () => {
      it('keeps the monitor decryptable after a partial patch on an AAD field', async () => {
        /*
         * Headline guarantee of this endpoint. Create a monitor that has
         * encrypted secrets (`username`, `password`) bound by AAD to a set
         * of plaintext attributes. Patch only `enabled` (which is itself
         * in the AAD set). Re-fetch the monitor: the GET endpoint goes
         * through `monitorConfigRepository.getDecrypted`, which will
         * throw a 500 if the AAD ever drifts from the encrypted value
         * during our merge.
         *
         * If `mergeSourceMonitor` ever stops carrying prev AAD attrs
         * through, this test turns the GET below into a 500.
         */
        const monitor = await createUiMonitor({
          username: 'aad-test-user',
          password: 'aad-test-pass',
          tags: ['aad', 'regression'],
        } as Partial<HTTPFields>);

        await bulkUpdate({
          ids: [monitor.config_id],
          attributes: { enabled: false },
        }).expect(200);

        const refreshed = await monitorTestService.getMonitor(monitor.config_id, {
          internal: true,
        });

        expect(refreshed.body.enabled).to.be(false);
        expect(refreshed.body.username).to.eql('aad-test-user');
        expect(refreshed.body.password).to.eql('aad-test-pass');
        expect(refreshed.body.tags).to.eql(['aad', 'regression']);
        expect(refreshed.body.urls).to.eql(monitor.urls);
      });
    });

    describe('per-id error reporting', () => {
      it('returns mixed updated/error entries when some ids do not exist', async () => {
        const monitor = await createUiMonitor();
        const missingId = uuidv4();

        const res = await bulkUpdate({
          ids: [monitor.config_id, missingId],
          attributes: { enabled: false },
        }).expect(200);

        expect(res.body.result).to.have.length(2);

        const updatedEntry = res.body.result.find((r: any) => r.id === monitor.config_id);
        const missingEntry = res.body.result.find((r: any) => r.id === missingId);

        expect(updatedEntry).to.eql({ id: monitor.config_id, updated: true });
        expect(missingEntry.updated).to.be(false);
        expect(missingEntry.error).to.match(/not found/i);
      });

      it('rejects project-origin monitors with `invalid_origin`', async () => {
        const projectName = `bulk-patch-project-${uuidv4()}`;
        const journeyId = `bulk-patch-journey-${uuidv4()}`;

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              projectName
            )
          )
          .set('kbn-xsrf', 'true')
          .send({
            monitors: [
              {
                type: 'http',
                id: journeyId,
                name: 'project monitor for bulk patch test',
                urls: ['https://elastic.co'],
                schedule: 5,
                locations: ['dev'],
                privateLocations: [],
              },
            ],
          })
          .expect(200);

        const list = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: "${journeyId}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const projectMonitorId = list.body.monitors[0].config_id as string;

        const res = await bulkUpdate({
          ids: [projectMonitorId],
          attributes: { enabled: false },
        }).expect(200);

        expect(res.body.result).to.have.length(1);
        expect(res.body.result[0].updated).to.be(false);
        expect(res.body.result[0].error).to.match(/origin/i);

        // Project monitor must remain unchanged.
        const refreshed = await monitorTestService.getMonitor(projectMonitorId);
        expect(refreshed.body.enabled).to.be(true);

        await monitorTestService.deleteMonitor(projectMonitorId);
      });

      it('rejects schedules outside the allowed set with `validation_failed`', async () => {
        const monitor = await createUiMonitor();

        const res = await bulkUpdate({
          ids: [monitor.config_id],
          attributes: { schedule: { number: '7', unit: 'm' } },
        }).expect(200);

        expect(res.body.result).to.have.length(1);
        expect(res.body.result[0].updated).to.be(false);
        expect(res.body.result[0].error).to.match(/schedule/i);

        const refreshed = await monitorTestService.getMonitor(monitor.config_id);
        expect(refreshed.body.schedule).to.eql({ number: '5', unit: 'm' });
      });
    });

    describe('input validation', () => {
      it('returns 400 when attributes is empty', async () => {
        const monitor = await createUiMonitor();

        const res = await bulkUpdate({
          ids: [monitor.config_id],
          attributes: {},
        }).expect(400);

        expect(res.body.message).to.match(/attributes/i);
      });

      it('returns 400 when ids is empty (schema-level rejection)', async () => {
        await bulkUpdate({ ids: [], attributes: { enabled: false } }).expect(400);
      });
    });
  });
}
