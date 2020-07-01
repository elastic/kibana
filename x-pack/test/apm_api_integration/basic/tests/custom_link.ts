/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import URL from 'url';
import expect from '@kbn/expect';
import { CustomLink } from '../../../../plugins/apm/common/custom_link/custom_link_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function customLinksTests({ getService }: FtrProviderContext) {
  const supertestRead = getService('supertestAsApmReadUser');
  const supertestWrite = getService('supertestAsApmWriteUser');
  const log = getService('log');

  function searchCustomLinks(filters?: any) {
    const path = URL.format({
      pathname: `/api/apm/settings/custom_links`,
      query: filters,
    });
    return supertestRead.get(path).set('kbn-xsrf', 'foo');
  }

  async function createCustomLink(customLink: CustomLink) {
    log.debug('creating configuration', customLink);
    const res = await supertestWrite
      .post(`/api/apm/settings/custom_links`)
      .send(customLink)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  async function updateCustomLink(id: string, customLink: CustomLink) {
    log.debug('updating configuration', id, customLink);
    const res = await supertestWrite
      .put(`/api/apm/settings/custom_links/${id}`)
      .send(customLink)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  async function deleteCustomLink(id: string) {
    log.debug('deleting configuration', id);
    const res = await supertestWrite
      .delete(`/api/apm/settings/custom_links/${id}`)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  function throwOnError(res: any) {
    const { statusCode, req, body } = res;
    if (statusCode !== 200) {
      throw new Error(`
      Endpoint: ${req.method} ${req.path}
      Service: ${JSON.stringify(res.request._data.service)}
      Status code: ${statusCode}
      Response: ${body.message}`);
    }
  }

  describe('custom links', () => {
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
      const { label, url, filters } = body[0];

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
      let { status, body } = await searchCustomLinks({
        'service.name': 'baz',
        'transaction.type': 'qux',
      });
      expect(status).to.equal(200);
      await updateCustomLink(body[0].id, {
        label: 'foo',
        url: 'https://elastic.co?service.name={{service.name}}',
        filters: [
          { key: 'service.name', value: 'quz' },
          { key: 'transaction.name', value: 'bar' },
        ],
      });
      ({ status, body } = await searchCustomLinks({
        'service.name': 'quz',
        'transaction.name': 'bar',
      }));
      const { label, url, filters } = body[0];
      expect(status).to.equal(200);
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
      let { status, body } = await searchCustomLinks({
        'service.name': 'quz',
        'transaction.name': 'bar',
      });
      expect(status).to.equal(200);
      await deleteCustomLink(body[0].id);
      ({ status, body } = await searchCustomLinks({
        'service.name': 'quz',
        'transaction.name': 'bar',
      }));
      expect(status).to.equal(200);
      expect(body).to.eql([]);
    });
  });
}
