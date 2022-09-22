/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  EXCEPTION_FILTER,
  EXCEPTION_LIST_URL,
  EXCEPTION_LIST_ITEM_URL,
} from '@kbn/securitysolution-list-constants';
import {
  getExceptionFilterFromExceptionItemsSchemaMock,
  getExceptionFilterFromExceptionIdsSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/get_exception_filter_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMockWithoutId } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';

import { createListsIndex, deleteListsIndex } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('get_exception_filter', () => {
    describe('get exception filter', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });

      it('should return an exception filter if correctly passed exception items', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_FILTER}`)
          .set('kbn-xsrf', 'true')
          .send(getExceptionFilterFromExceptionItemsSchemaMock())
          .expect(200);

        expect(body).to.eql({
          filter: {
            meta: {
              alias: null,
              disabled: false,
              negate: true,
            },
            query: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        {
                          nested: {
                            path: 'some.parentField',
                            query: {
                              bool: {
                                minimum_should_match: 1,
                                should: [
                                  {
                                    match_phrase: {
                                      'some.parentField.nested.field': 'some value',
                                    },
                                  },
                                ],
                              },
                            },
                            score_mode: 'none',
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'some.not.nested.field': 'some value',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        });
      });

      it('should return an exception filter if correctly passed exception ids', async () => {
        // create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        // create exception list items
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemMinimalSchemaMockWithoutId(),
            list_id: getCreateExceptionListDetectionSchemaMock().list_id,
            item_id: '1',
            entries: [
              { field: 'host.name', value: 'some host', operator: 'included', type: 'match' },
            ],
          })
          .expect(200);
        const { body } = await supertest
          .post(`${EXCEPTION_FILTER}`)
          .set('kbn-xsrf', 'true')
          .send(getExceptionFilterFromExceptionIdsSchemaMock())
          .expect(200);

        expect(body).to.eql({
          filter: {
            meta: {
              alias: null,
              disabled: false,
              negate: true,
            },
            query: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'host.os.type': 'windows',
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'host.name': 'some host',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'host.os.name.caseless': 'windows',
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'host.name': 'some host',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        });
      });
    });
  });
};
