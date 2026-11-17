/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import {
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';

import { deleteAllExceptions } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const LIST_ID = 'some-list-id';

const legacyItem = {
  description: 'An item that does not say what it applies to',
  entries: [{ field: 'host.name', operator: 'included', type: 'match', value: 'dc-01' }],
  item_id: 'legacy-item',
  list_id: LIST_ID,
  name: 'legacy item',
  type: 'simple',
};

const esqlEntries = [
  {
    column_type: 'keyword',
    field: 'target_host',
    operator: 'included',
    type: 'match',
    value: 'dc-01',
  },
  {
    column_type: 'ip',
    field: 'src_ip',
    operator: 'excluded',
    type: 'match_any',
    value: ['10.0.0.1', '10.0.0.0/24'],
  },
  { column_type: 'double', field: 'score', operator: 'included', type: 'exists' },
];

const esqlItem = {
  ...legacyItem,
  applies_to: 'esql_output_columns',
  description: 'An item that applies to the ES|QL output columns',
  entries: esqlEntries,
  item_id: 'esql-item',
  name: 'esql item',
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  const createItem = (body: Record<string, unknown>) =>
    supertest.post(EXCEPTION_LIST_ITEM_URL).set('kbn-xsrf', 'true').send(body);
  const updateItem = (body: Record<string, unknown>) =>
    supertest.put(EXCEPTION_LIST_ITEM_URL).set('kbn-xsrf', 'true').send(body);
  const readItem = (itemId: string) =>
    supertest.get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${itemId}&namespace_type=single`);

  describe('@ess applies_to of the exception list items', () => {
    beforeEach(async () => {
      await deleteAllExceptions(supertest, log);
      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListMinimalSchemaMock())
        .expect(200);
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('items that do not say what they apply to', () => {
      it('are created, read, updated and found as before, with no applies_to', async () => {
        const { body: created } = await createItem(legacyItem).expect(200);
        expect(created).not.to.have.property('applies_to');

        const { body: read } = await readItem('legacy-item').expect(200);
        expect(read).not.to.have.property('applies_to');

        const { body: updated } = await updateItem({
          ...legacyItem,
          description: 'updated',
        }).expect(200);
        expect(updated.description).to.eql('updated');
        expect(updated).not.to.have.property('applies_to');

        const { body: found } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${LIST_ID}&namespace_type=single`)
          .expect(200);
        expect(found.data).to.have.length(1);
        expect(found.data[0]).not.to.have.property('applies_to');
      });

      it('accept applies_to "source_documents", which is what they apply to', async () => {
        const { body } = await createItem({ ...legacyItem, applies_to: 'source_documents' }).expect(
          200
        );
        expect(body.applies_to).to.eql('source_documents');
      });

      it('reject a column_type, which only the entries of an item on the output columns have', async () => {
        const { body } = await createItem({
          ...legacyItem,
          entries: [{ ...legacyItem.entries[0], column_type: 'keyword' }],
        }).expect(400);
        expect(body.message).to.contain('column_type can only be set on the entries of an item');
      });

      it('reject an applies_to that does not exist', async () => {
        await createItem({ ...legacyItem, applies_to: 'document_level_filter' }).expect(400);
      });
    });

    describe('items that apply to the ES|QL output columns', () => {
      it('are created, read, found and updated with their column types', async () => {
        const { body: created } = await createItem(esqlItem).expect(200);
        expect(created.applies_to).to.eql('esql_output_columns');
        expect(created.entries).to.eql(esqlEntries);

        const { body: read } = await readItem('esql-item').expect(200);
        expect(read.applies_to).to.eql('esql_output_columns');
        expect(read.entries).to.eql(esqlEntries);

        const { body: found } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${LIST_ID}&namespace_type=single`)
          .expect(200);
        expect(found.data[0].applies_to).to.eql('esql_output_columns');

        const { body: updated } = await updateItem({
          ...esqlItem,
          description: 'updated',
          entries: [esqlEntries[0]],
        }).expect(200);
        expect(updated.applies_to).to.eql('esql_output_columns');
        expect(updated.description).to.eql('updated');
        expect(updated.entries).to.eql([esqlEntries[0]]);
      });

      it('name every entry that cannot be saved', async () => {
        const { body } = await createItem({
          ...esqlItem,
          entries: [
            {
              column_type: 'ip',
              field: 'src_ip',
              operator: 'included',
              type: 'match',
              value: 'bogus',
            },
            {
              column_type: 'long',
              field: 'count',
              operator: 'included',
              type: 'wildcard',
              value: '1*',
            },
            {
              column_type: 'double',
              field: 'ratio',
              operator: 'included',
              type: 'match',
              value: '1',
            },
            { field: 'plain', operator: 'included', type: 'match', value: 'x' },
          ],
        }).expect(400);

        expect(body.message).to.contain('value "bogus" is not valid for a column of type ip');
        expect(body.message).to.contain(
          'of type wildcard is not supported on a column of type long'
        );
        expect(body.message).to.contain(
          'of type match is not supported on a column of type double'
        );
        expect(body.message).to.contain('the entry on the field "plain" needs a column_type');
      });

      it('reject os_types, value lists and nested entries', async () => {
        const { body } = await createItem({
          ...esqlItem,
          entries: [
            { field: 'ip', list: { id: 'list', type: 'ip' }, operator: 'included', type: 'list' },
            {
              entries: [{ field: 'name', operator: 'included', type: 'match', value: 'x' }],
              field: 'process',
              type: 'nested',
            },
          ],
          os_types: ['linux'],
        }).expect(400);

        expect(body.message).to.contain('cannot have os_types');
        expect(body.message).to.contain('has the type "list"');
        expect(body.message).to.contain('has the type "nested"');
      });

      it('cannot change what they apply to, as a client that does not know applies_to would do', async () => {
        await createItem(esqlItem).expect(200);

        const { applies_to: _appliesTo, ...withoutAppliesTo } = esqlItem;
        const { body: omitted } = await updateItem(withoutAppliesTo).expect(400);
        expect(omitted.message).to.contain(
          'it applies to "esql_output_columns" and cannot change to "source_documents"'
        );

        const { body: read } = await readItem('esql-item').expect(200);
        expect(read.applies_to).to.eql('esql_output_columns');
        expect(read.entries).to.eql(esqlEntries);
      });

      it('cannot be made out of an item on the source documents', async () => {
        await createItem(legacyItem).expect(200);

        const { body } = await updateItem({ ...esqlItem, item_id: 'legacy-item' }).expect(400);
        expect(body.message).to.contain(
          'it applies to "source_documents" and cannot change to "esql_output_columns"'
        );
      });

      it('keep what they apply to when the list is duplicated', async () => {
        await createItem(esqlItem).expect(200);
        await createItem(legacyItem).expect(200);

        const { body: duplicated } = await supertest
          .post(
            `${EXCEPTION_LIST_URL}/_duplicate?list_id=${LIST_ID}&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { body: found } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${duplicated.list_id}&namespace_type=single`
          )
          .expect(200);
        const appliesTo = found.data.map(
          (item: { applies_to?: string }) => item.applies_to ?? 'not set'
        );
        expect(appliesTo.sort()).to.eql(['esql_output_columns', 'not set']);
      });
    });

    describe('import', () => {
      const importNdjson = (items: Array<Record<string, unknown>>) =>
        supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            Buffer.from(
              toNdJsonString([getImportExceptionsListSchemaMock('imported-list'), ...items])
            ),
            'exceptions.ndjson'
          );

      it('imports an item that applies to the ES|QL output columns and keeps what it applies to', async () => {
        const { body } = await importNdjson([
          { ...esqlItem, item_id: 'imported-esql-item', list_id: 'imported-list' },
        ]).expect(200);
        expect(body.success).to.eql(true);
        expect(body.success_count_exception_list_items).to.eql(1);

        const { body: read } = await readItem('imported-esql-item').expect(200);
        expect(read.applies_to).to.eql('esql_output_columns');
        expect(read.entries).to.eql(esqlEntries);
      });

      it('reports an item that cannot be saved, and imports the others', async () => {
        const { body } = await importNdjson([
          {
            ...esqlItem,
            entries: [
              {
                column_type: 'ip',
                field: 'src_ip',
                operator: 'included',
                type: 'match',
                value: 'bogus',
              },
            ],
            item_id: 'invalid-esql-item',
            list_id: 'imported-list',
          },
          { ...legacyItem, item_id: 'imported-legacy-item', list_id: 'imported-list' },
        ]).expect(200);

        expect(body.success).to.eql(false);
        expect(body.success_count_exception_list_items).to.eql(1);
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].item_id).to.eql('invalid-esql-item');
        expect(body.errors[0].error.status_code).to.eql(400);
        expect(body.errors[0].error.message).to.contain(
          'value "bogus" is not valid for a column of type ip'
        );
      });
    });
  });
};
