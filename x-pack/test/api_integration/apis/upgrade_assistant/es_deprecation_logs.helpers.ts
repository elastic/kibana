/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Chance from 'chance';

import {
  DEPRECATION_LOGS_INDEX,
  DEPRECATION_LOGS_ORIGIN_FIELD,
} from '../../../../plugins/upgrade_assistant/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

const chance = new Chance();
const CHARS_POOL = 'abcdefghijklmnopqrstuvwxyz';
const getRandomString = () => `${chance.string({ pool: CHARS_POOL })}-${Date.now()}`;

const deprecationMock = {
  'event.dataset': 'deprecation.elasticsearch',
  '@timestamp': '2021-12-06T16:28:11,104Z',
  'log.level': 'CRITICAL',
  'log.logger':
    'org.elasticsearch.deprecation.rest.action.admin.indices.RestGetIndexTemplateAction',
  'elasticsearch.cluster.name': 'es-test-cluster',
  'elasticsearch.cluster.uuid': 'PBE1syg4ToKCA0DcD2nKEw',
  'elasticsearch.node.id': '_0gaVTs5TIO_JWuFl9URJA',
  'elasticsearch.node.name': 'node-01',
  message:
    '[types removal] Specifying include_type_name in get index template requests is deprecated.',
  'data_stream.type': 'logs',
  'data_stream.dataset': 'deprecation.elasticsearch',
  'data_stream.namespace': 'default',
  'ecs.version': '1.7',
  'elasticsearch.event.category': 'types',
  'event.code': 'get_index_template_include_type_name',
  'elasticsearch.http.request.x_opaque_id': 'd17e37e2-d41f-49cc-8186-35bcdcd99770',
};

export const initHelpers = (getService: FtrProviderContext['getService']) => {
  const es = getService('es');

  const createDeprecationLog = async (isElasticProduct = false) => {
    const id = getRandomString();

    const body = {
      ...deprecationMock,
    };

    if (isElasticProduct) {
      (body as any)[DEPRECATION_LOGS_ORIGIN_FIELD] = 'kibana';
    }

    await es.index({
      id,
      index: DEPRECATION_LOGS_INDEX,
      op_type: 'create',
      refresh: true,
      body,
    });

    return id;
  };

  const deleteDeprecationLogs = async (docIds: string[]) => {
    return await es.deleteByQuery({
      index: DEPRECATION_LOGS_INDEX,
      refresh: true,
      body: {
        query: {
          ids: { values: docIds },
        },
      },
    });
  };

  return {
    createDeprecationLog,
    deleteDeprecationLogs,
  };
};
