/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { SUPPORTED_TRAINED_MODELS } from '../../../functional/services/ml/api';

interface KnowledgeBaseEntry {
  id: string;
  text: string;
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ml = getService('ml');
  const es = getService('es');
  const TINY_ELSER = {
    ...SUPPORTED_TRAINED_MODELS.TINY_ELSER,
    id: SUPPORTED_TRAINED_MODELS.TINY_ELSER.name,
  };
  const KNOWLEDGE_BASE_API_URL = `/internal/observability_ai_assistant/kb`;
  const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';

  describe('Knowledge base', () => {
    before(async () => {
      const config = {
        ...ml.api.getTrainedModelConfig(TINY_ELSER.name),
        input: {
          field_names: ['text_field'],
        },
      };
      await ml.api.importTrainedModel(TINY_ELSER.name, TINY_ELSER.id, config);
      await ml.api.assureMlStatsIndexExists();
    });

    after(async () => {
      await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
      await ml.api.deleteTrainedModelES(TINY_ELSER.id);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('returns 200 on knowledge base setup', async () => {
      return await supertest
        .post(`${KNOWLEDGE_BASE_API_URL}/setup`)
        .set('kbn-xsrf', 'foo')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({});
        });
    });

    describe('when managing a single entry', () => {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-1',
        text: 'My content',
      };
      it('returns 200 on create', async () => {
        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/save`)
          .set('kbn-xsrf', 'foo')
          .send(knowledgeBaseEntry)
          .expect(200);

        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            const entry = response.body.entries[0];
            expect(entry.id).to.equal(knowledgeBaseEntry.id);
            expect(entry.text).to.equal(knowledgeBaseEntry.text);
          });
      });

      it('returns 400 on create with bad payload', async () => {
        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/save`)
          .set('kbn-xsrf', 'foo')
          .send({
            foo: 'my-doc-id-2',
          })
          .expect(400);
      });
      it('returns 200 on get entries and entry exists', async () => {
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            const entry = response.body.entries[0];
            expect(entry.id).to.equal(knowledgeBaseEntry.id);
            expect(entry.text).to.equal(knowledgeBaseEntry.text);
          });
      });

      it('returns 200 on delete', async () => {
        await supertest
          .delete(`${KNOWLEDGE_BASE_API_URL}/entries/my-doc-id-1`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(
              response.body.entries.filter((entry: KnowledgeBaseEntry) =>
                entry.id.startsWith('my-doc-id')
              ).length
            ).to.eql(0);
          });
      });

      it('returns 500 on delete not found', async () => {
        await supertest
          .delete(`${KNOWLEDGE_BASE_API_URL}/entries/my-doc-id-1`)
          .set('kbn-xsrf', 'foo')
          .expect(500);
      });
    });
    describe('when managing multiple entries', () => {
      before(async () => {
        es.deleteByQuery({
          index: KB_INDEX,
          conflicts: 'proceed',
          query: { match_all: {} },
        });
      });
      afterEach(async () => {
        es.deleteByQuery({
          index: KB_INDEX,
          conflicts: 'proceed',
          query: { match_all: {} },
        });
      });
      const knowledgeBaseEntries: KnowledgeBaseEntry[] = [
        {
          id: 'my_doc_a',
          text: 'My content a',
        },
        {
          id: 'my_doc_b',
          text: 'My content b',
        },
        {
          id: 'my_doc_c',
          text: 'My content c',
        },
      ];
      it('returns 200 on create', async () => {
        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/import`)
          .set('kbn-xsrf', 'foo')
          .send({ entries: knowledgeBaseEntries })
          .expect(200);

        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(
              response.body.entries.filter((entry: KnowledgeBaseEntry) =>
                entry.id.startsWith('my_doc')
              ).length
            ).to.eql(3);
          });
      });

      it('returns 400 on create with bad payload', async () => {
        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/import`)
          .set('kbn-xsrf', 'foo')
          .send({
            entries: [...knowledgeBaseEntries, { foo: 'my_doc_a' }],
          })
          .expect(400);
        await supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(
              response.body.entries.filter((entry: KnowledgeBaseEntry) =>
                entry.id.startsWith('my_doc')
              ).length
            ).to.eql(3);
          });
      });

      it('returns 400 when calling get entries with the wrong parameters', async () => {
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries`)
          .set('kbn-xsrf', 'foo')
          .expect(400);
      });
      it('allows sorting', async () => {
        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/import`)
          .set('kbn-xsrf', 'foo')
          .send({ entries: knowledgeBaseEntries })
          .expect(200);
        // desc
        await supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=desc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            const entries = response.body.entries.filter((entry: KnowledgeBaseEntry) =>
              entry.id.startsWith('my_doc')
            );
            expect(entries[0].id).to.eql('my_doc_c');
            expect(entries[1].id).to.eql('my_doc_b');
            expect(entries[2].id).to.eql('my_doc_a');
          });
        // asc
        await supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            const entries = response.body.entries.filter((entry: KnowledgeBaseEntry) =>
              entry.id.startsWith('my_doc')
            );
            expect(entries[0].id).to.eql('my_doc_a');
            expect(entries[1].id).to.eql('my_doc_b');
            expect(entries[2].id).to.eql('my_doc_c');
          });
      });
      it('allows searching', async () => {
        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/import`)
          .set('kbn-xsrf', 'foo')
          .send({ entries: knowledgeBaseEntries })
          .expect(200);
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=my_doc_a&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body.entries.length).to.eql(1);
            expect(response.body.entries[0].id).to.eql('my_doc_a');
          });
      });
    });
  });
}
