/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  getAnonymizationFields,
  performAnonymizationFieldsBulkActions,
  updateAnonymizationFields,
} from '../utils/api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const space = 'default';
  const client = getService('es');

  describe('@ess @serverless Update Anonymization Fields', () => {
    after(async () => {
      // delete all anonymization fields data stream
      await client.indices.deleteDataStream({
        name: '.kibana-elastic-ai-assistant-anonymization-fields-default',
        expand_wildcards: 'all',
      });

      // perform update to recreate index with default fields
      await updateAnonymizationFields({ supertest, space });
    });

    it('When users DENY a default anonymization field, the default field is still denied after upgrade', async () => {
      const responseBeforeUpdate = await getAnonymizationFields({ supertest, space });
      const fieldBeforeUpdate = findFieldByName(responseBeforeUpdate.body.data, '@timestamp');

      // Update @timestamp field to be
      await performAnonymizationFieldsBulkActions({
        supertest,
        space,
        body: {
          update: [{ id: fieldBeforeUpdate?.id!, allowed: false, anonymized: true }],
        },
      });

      await updateAnonymizationFields({ supertest, space });

      const response = await getAnonymizationFields({ supertest, space });
      const field = findFieldByName(response.body.data, '@timestamp');

      expect(field).toEqual(
        expect.objectContaining({
          allowed: false,
          anonymized: true,
        })
      );
    });

    it('When users ENABLE anonymization on a default field, default field is still anonymized after upgrade', async () => {
      const responseBeforeUpdate = await getAnonymizationFields({ supertest, space });
      const fieldBeforeUpdate = findFieldByName(responseBeforeUpdate.body.data, '_id');

      // Update _id field to be anonymized
      await performAnonymizationFieldsBulkActions({
        supertest,
        space,
        body: { update: [{ id: fieldBeforeUpdate?.id!, allowed: true, anonymized: true }] },
      });

      await updateAnonymizationFields({ supertest, space });

      const response = await getAnonymizationFields({ supertest, space });
      const field = findFieldByName(response.body.data, '_id');

      expect(field).toEqual(
        expect.objectContaining({
          allowed: true,
          anonymized: true,
        })
      );
    });

    it('When users DISABLE anonymization on a default field that’s anonymized by default the default field is still NOT anonymized after upgrade', async () => {
      const responseBeforeUpdate = await getAnonymizationFields({ supertest, space });
      const fieldBeforeUpdate = findFieldByName(responseBeforeUpdate.body.data, 'user.name');

      // Update user.name field to be not anonymized
      await performAnonymizationFieldsBulkActions({
        supertest,
        space,
        body: { update: [{ id: fieldBeforeUpdate?.id!, allowed: true, anonymized: false }] },
      });

      await updateAnonymizationFields({ supertest, space });

      const response = await getAnonymizationFields({ supertest, space });
      const field = findFieldByName(response.body.data, 'user.name');

      expect(field).toEqual(
        expect.objectContaining({
          allowed: true,
          anonymized: false,
        })
      );
    });

    it('When users ALLOW additional anonymization fields, the additional fields are allowed after upgrade', async () => {
      await performAnonymizationFieldsBulkActions({
        supertest,
        space,
        body: { create: [{ field: 'testField123', allowed: true, anonymized: false }] },
      });

      await updateAnonymizationFields({ supertest, space });

      const response = await getAnonymizationFields({ supertest, space });
      const field = findFieldByName(response.body.data, 'testField123');

      expect(field).toEqual(
        expect.objectContaining({
          allowed: true,
          anonymized: false,
        })
      );
    });

    it('When users ENABLE anonymization on additional fields, the additional fields are still anonymized after upgrade', async () => {
      await performAnonymizationFieldsBulkActions({
        supertest,
        space,
        body: { create: [{ field: 'testField321', allowed: false, anonymized: true }] },
      });

      await updateAnonymizationFields({ supertest, space });

      const response = await getAnonymizationFields({ supertest, space });
      const field = findFieldByName(response.body.data, 'testField321');

      expect(field).toEqual(
        expect.objectContaining({
          allowed: false,
          anonymized: true,
        })
      );
    });

    it('When users DELETE a default anonymization field, the field is recreated with default values after upgrade', async () => {
      const responseBeforeUpdate = await getAnonymizationFields({ supertest, space });
      const fieldBeforeUpdate = findFieldByName(responseBeforeUpdate.body.data, 'host.name');

      // Delete host.name field
      await performAnonymizationFieldsBulkActions({
        supertest,
        space,
        body: { delete: { ids: [fieldBeforeUpdate?.id!] } },
      });

      await updateAnonymizationFields({ supertest, space });

      const response = await getAnonymizationFields({ supertest, space });
      const field = findFieldByName(response.body.data, 'host.name');

      expect(field).toEqual(
        expect.objectContaining({
          allowed: true,
          anonymized: true,
        })
      );
    });
  });
};

const findFieldByName = (fields: AnonymizationFieldResponse[], fieldName: string) => {
  return fields.find((f) => f.field === fieldName);
};
