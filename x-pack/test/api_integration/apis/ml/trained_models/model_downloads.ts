/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type NodesInfoNodeInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const deployment = getService('deployment');
  const esSupertest = getService('esSupertest');

  describe('GET trained_models/model_downloads', function () {
    before(async () => {
      await ml.api.initSavedObjects();
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('returns the list of models available for download', async () => {
      const isCloud = await deployment.isCloud();

      const { body: mlNodesResponse } = await esSupertest.get('/_nodes/ml:true/os');

      // Check that all ML nodes are Intel-based.
      const areMlNodesIntelBased = Object.values(
        mlNodesResponse.nodes as Record<string, NodesInfoNodeInfo>
      ).every((node) => node.os?.name === 'Linux' && node.os?.arch === 'amd64');

      const isIntelBased = isCloud || areMlNodesIntelBased;

      const { body, status } = await supertest
        .get(`/internal/ml/trained_models/model_downloads`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(5);

      expect(body).to.eql([
        {
          modelName: 'elser',
          hidden: true,
          supported: false,
          version: 1,
          config: {
            input: {
              field_names: ['text_field'],
            },
          },
          description: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
          type: ['elastic', 'pytorch', 'text_expansion'],
          model_id: '.elser_model_1',
        },
        {
          modelName: 'elser',
          version: 2,
          config: {
            input: {
              field_names: ['text_field'],
            },
          },
          description: 'Elastic Learned Sparse EncodeR v2',
          type: ['elastic', 'pytorch', 'text_expansion'],
          model_id: '.elser_model_2',
          supported: true,
          ...(isIntelBased ? { default: true } : { recommended: true }),
        },
        {
          modelName: 'elser',
          version: 2,
          os: 'Linux',
          arch: 'amd64',
          config: {
            input: {
              field_names: ['text_field'],
            },
          },
          description: 'Elastic Learned Sparse EncodeR v2, optimized for linux-x86_64',
          type: ['elastic', 'pytorch', 'text_expansion'],
          model_id: '.elser_model_2_linux-x86_64',
          ...(isIntelBased ? { recommended: true, supported: true } : { supported: false }),
        },
        {
          modelName: 'e5',
          version: 1,
          config: {
            input: {
              field_names: ['text_field'],
            },
          },
          description: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
          license: 'MIT',
          licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small',
          type: ['pytorch', 'text_embedding'],
          model_id: '.multilingual-e5-small',
          supported: true,
          ...(isIntelBased ? { default: true } : { recommended: true }),
        },
        {
          modelName: 'e5',
          version: 1,
          os: 'Linux',
          arch: 'amd64',
          config: {
            input: {
              field_names: ['text_field'],
            },
          },
          description:
            'E5 (EmbEddings from bidirEctional Encoder rEpresentations), optimized for linux-x86_64',
          license: 'MIT',
          licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small_linux-x86_64',
          type: ['pytorch', 'text_embedding'],
          model_id: '.multilingual-e5-small_linux-x86_64',
          ...(isIntelBased ? { recommended: true, supported: true } : { supported: false }),
        },
      ]);
    });

    it('returns an error for unauthorized user', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models/model_downloads`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};
