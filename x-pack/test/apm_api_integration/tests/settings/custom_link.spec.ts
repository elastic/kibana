/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomLink } from '../../../../plugins/apm/common/custom_link/custom_link_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ApmApiError } from '../../common/apm_api_supertest';

export default function customLinksTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const log = getService('log');

  const archiveName = 'apm_8.0.0';

  registry.when('Custom links with a basic license', { config: 'basic', archives: [] }, () => {
    it('returns a 403 forbidden', async () => {
      const customLink = {
        url: 'https://elastic.co',
        label: 'with filters',
        filters: [
          { key: 'service.name', value: 'baz' },
          { key: 'transaction.type', value: 'qux' },
        ],
      } as CustomLink;

      const err = await expectToReject<ApmApiError>(() => createCustomLink(customLink));
      expect(err.res.status).to.be(403);
      expectSnapshot(err.res.body.message).toMatchInline(
        `"To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services."`
      );
    });
  });

  registry.when(
    'Custom links with a trial license and data',
    { config: 'trial', archives: [archiveName] },
    () => {
      before(async () => {
        const customLink = {
          url: 'https://elastic.co',
          label: 'with filters',
          filters: [
            { key: 'service.name', value: 'baz' },
            { key: 'transaction.type', value: 'qux' },
          ],
        } as CustomLink;

        await createCustomLink(customLink);
      });

      it('fetches a custom link', async () => {
        const { status, body } = await searchCustomLinks({
          'service.name': 'baz',
          'transaction.type': 'qux',
        });
        const { label, url, filters } = body.customLinks[0];

        expect(status).to.equal(200);
        expect({ label, url, filters }).to.eql({
          label: 'with filters',
          url: 'https://elastic.co',
          filters: [
            { key: 'service.name', value: 'baz' },
            { key: 'transaction.type', value: 'qux' },
          ],
        });
      });

      it('updates a custom link', async () => {
        const { status, body } = await searchCustomLinks({
          'service.name': 'baz',
          'transaction.type': 'qux',
        });
        expect(status).to.equal(200);

        const id = body.customLinks[0].id!;
        await updateCustomLink(id, {
          label: 'foo',
          url: 'https://elastic.co?service.name={{service.name}}',
          filters: [
            { key: 'service.name', value: 'quz' },
            { key: 'transaction.name', value: 'bar' },
          ],
        });

        const { status: newStatus, body: newBody } = await searchCustomLinks({
          'service.name': 'quz',
          'transaction.name': 'bar',
        });

        const { label, url, filters } = newBody.customLinks[0];
        expect(newStatus).to.equal(200);
        expect({ label, url, filters }).to.eql({
          label: 'foo',
          url: 'https://elastic.co?service.name={{service.name}}',
          filters: [
            { key: 'service.name', value: 'quz' },
            { key: 'transaction.name', value: 'bar' },
          ],
        });
      });

      it('deletes a custom link', async () => {
        const { status, body } = await searchCustomLinks({
          'service.name': 'quz',
          'transaction.name': 'bar',
        });
        expect(status).to.equal(200);
        expect(body.customLinks.length).to.be(1);

        const id = body.customLinks[0].id!;
        await deleteCustomLink(id);

        const { status: newStatus, body: newBody } = await searchCustomLinks({
          'service.name': 'quz',
          'transaction.name': 'bar',
        });
        expect(newStatus).to.equal(200);
        expect(newBody.customLinks.length).to.be(0);
      });

      it('fetches a transaction sample', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/settings/custom_links/transaction',
          params: {
            query: {
              'service.name': 'opbeans-java',
            },
          },
        });
        expect(response.status).to.be(200);
        expect(response.body.service.name).to.eql('opbeans-java');
      });
    }
  );

  function searchCustomLinks(filters?: any) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/settings/custom_links',
      params: {
        query: filters,
      },
    });
  }

  async function createCustomLink(customLink: CustomLink) {
    log.debug('creating configuration', customLink);

    return apmApiClient.writeUser({
      endpoint: 'POST /internal/apm/settings/custom_links',
      params: {
        body: customLink,
      },
    });
  }

  async function updateCustomLink(id: string, customLink: CustomLink) {
    log.debug('updating configuration', id, customLink);

    return apmApiClient.writeUser({
      endpoint: 'PUT /internal/apm/settings/custom_links/{id}',
      params: {
        path: { id },
        body: customLink,
      },
    });
  }

  async function deleteCustomLink(id: string) {
    log.debug('deleting configuration', id);

    return apmApiClient.writeUser({
      endpoint: 'DELETE /internal/apm/settings/custom_links/{id}',
      params: { path: { id } },
    });
  }
}

async function expectToReject<T extends Error>(fn: () => Promise<any>): Promise<T> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error(`Expected fn to throw`);
}
