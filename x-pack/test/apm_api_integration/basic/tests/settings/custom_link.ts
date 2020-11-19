/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { CustomLink } from '../../../../../plugins/apm/common/custom_link/custom_link_types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function customLinksTests({ getService }: FtrProviderContext) {
  const supertestWrite = getService('supertestAsApmWriteUser');

  describe('custom links', () => {
    it('is only be available to users with Gold license (or higher)', async () => {
      const customLink = {
        url: 'https://elastic.co',
        label: 'with filters',
        filters: [
          { key: 'service.name', value: 'baz' },
          { key: 'transaction.type', value: 'qux' },
        ],
      } as CustomLink;
      const response = await supertestWrite
        .post(`/api/apm/settings/custom_links`)
        .send(customLink)
        .set('kbn-xsrf', 'foo');

      expect(response.status).to.be(403);

      expectSnapshot(response.body.message).toMatchInline(
        `"To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services."`
      );
    });
  });
}
