/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import * as uuid from 'uuid';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  // Using the kibanaServer service from FTR
  const kibanaServer = getService('kibanaServer');

  const expectedAnonymizationFieldsCount = 102;
  const parallelRequests = 30;
  const parallelSpaceRequests = 20;
  describe('Anonymization Fields Duplication Tests', () => {
    let supertest: TestAgent;
    let search: SearchService;
    let spaceId: string;
    before(async () => {
      supertest = await utils.createSuperTest();
      search = await utils.createSearch();
    });

    beforeEach(async () => {
      // Reset before each test
      spaceId = uuid.v4();
      try {
        await es.indices.deleteDataStream({
          name: '.kibana-elastic-ai-assistant-anonymization-fields*',
          expand_wildcards: 'all',
        });
      } catch (err) {
        // Ignore errors if indices don't exist
        log.debug('datastream .kibana-elastic-ai-assistant-anonymization-fields* do not exist');
      }

      // Create a test space

      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'true')
        .send({
          id: spaceId,
          name: spaceId,
          disabledFeatures: [],
        })
        .expect(200);

      await supertest
        .get(`/app/s/${spaceId}/management/kibana/securityAiAssistantManagement?tab=anonymization`)
        .set('kbn-xsrf', 'true')
        .expect(200);
    });

    it('Scenario 1: Tests for race conditions in initialization', async () => {
      // Make multiple concurrent requests to initialize the assistant
      log.debug(`Making concurrent requests to trigger race condition: ${spaceId}`);

      // Create an array of promises for concurrent requests
      const requests = [];

      for (let i = 0; i < parallelRequests; i++) {
        requests.push(
          supertest
            .get(
              `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
            )
            .set('kbn-xsrf', 'true')
            .expect(200)
        );
      }
      // Execute all requests concurrently
      await Promise.all(requests);
      log.debug('All concurrent requests completed');
      // // Check if anonymization fields were created

      const response = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      log.debug(`Found ${response.hits.total.value} anonymization fields`);
      expect(response.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
    });

    it('Scenario 2: Tests multiple space initialization', async () => {
      // Create a second test space
      const secondSpaceId = uuid.v4();
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'true')
        .send({
          id: secondSpaceId,
          name: secondSpaceId,
          disabledFeatures: [],
        })
        .expect(200);

      log.debug(`Created second test space: ${secondSpaceId}`);

      // Initialize in first space
      await supertest
        .get(
          `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug(`Initialized in first space: ${spaceId}`);

      // Quickly initialize in second space
      await supertest
        .get(
          `/s/${secondSpaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug(`Initialized in second space: ${secondSpaceId}`);

      // Check indices for both spaces
      const firstSpaceFields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      const secondSpaceFields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${secondSpaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      log.debug(`First space has ${firstSpaceFields.hits.total.value} fields`);
      log.debug(`Second space has ${secondSpaceFields.hits.total.value} fields`);

      expect(firstSpaceFields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
      expect(secondSpaceFields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
    });

    it('Scenario 3: Tests search query issues with delayed requests', async () => {
      // We'll simulate search query issues by making requests with delays between them
      log.debug(`Testing search query issues with delayed requests: ${spaceId}`);

      // Make first request
      await supertest
        .get(
          `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug('First request completed');

      // Make second request
      await supertest
        .get(
          `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug('Second request completed');

      // Check for duplicate fields
      const fields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      log.debug(`Found ${fields.hits.total.value} anonymization fields after delayed requests`);
      expect(fields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
    });

    it('Scenario 5: Tests initialization with multiple endpoints', async () => {
      // Test with multiple different endpoints that might trigger initialization
      log.debug(`Testing with multiple endpoints: ${spaceId}`);

      // First endpoint
      await supertest
        .get(
          `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug('First endpoint request completed');

      // Second endpoint
      await supertest
        .get(
          `/s/${spaceId}/api/security_ai_assistant/current_user/conversations/_find?per_page=1&page=1&fields=title`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug('Second endpoint request completed');

      // Third endpoint
      await supertest
        .get(`/s/${spaceId}/api/security_ai_assistant/prompts/_find`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug('Third endpoint request completed');

      // Check for duplicate fields
      const fields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      log.debug(`Found ${fields.hits.total.value} anonymization fields after multiple endpoints`);
      expect(fields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
    });

    it('Comprehensive test: Combines multiple scenarios', async () => {
      // Create a second test space
      const secondSpaceId = uuid.v4();
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'true')
        .send({
          id: secondSpaceId,
          name: secondSpaceId,
          disabledFeatures: [],
        })
        .expect(200);

      log.debug(`Created second test space: ${secondSpaceId}`);

      // Make concurrent requests to both spaces with different endpoints
      const requests = [
        // First space requests
        supertest
          .get(
            `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
          )
          .set('kbn-xsrf', 'true')
          .expect(200),
        supertest
          .get(
            `/s/${spaceId}/api/security_ai_assistant/current_user/conversations/_find?per_page=1&page=1&fields=title`
          )
          .set('kbn-xsrf', 'true')
          .expect(200),

        // Second space requests
        supertest
          .get(
            `/s/${secondSpaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
          )
          .set('kbn-xsrf', 'true')
          .expect(200),
        supertest
          .get(
            `/s/${secondSpaceId}/api/security_ai_assistant/current_user/conversations/_find?per_page=1&page=1&fields=title`
          )
          .set('kbn-xsrf', 'true')
          .expect(200),
      ];

      // Execute requests with slight delays to increase chance of race conditions
      for (const request of requests) {
        await Promise.all([request]);
      }

      log.debug('All requests completed');

      // Check for duplicate fields in both spaces
      const firstSpaceFields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      const secondSpaceFields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${secondSpaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      log.debug(`First space has ${firstSpaceFields.hits.total.value} fields`);
      log.debug(`Second space has ${secondSpaceFields.hits.total.value} fields`);

      expect(firstSpaceFields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
      expect(secondSpaceFields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
    });

    it('Scenario 6: Tests multiple spaces created and accessed simultaneously', async () => {
      // Create multiple spaces and access them simultaneously
      log.debug('Creating multiple spaces and accessing anonymization fields simultaneously');

      // Create multiple space IDs
      const spaceIds = Array.from({ length: parallelSpaceRequests }, () => uuid.v4());

      // First create all spaces
      const createSpacePromises = spaceIds.map((id) =>
        supertest
          .post('/api/spaces/space')
          .set('kbn-xsrf', 'true')
          .send({
            id,
            name: id,
            disabledFeatures: [],
          })
          .expect(200)
      );

      await Promise.all(createSpacePromises);
      log.debug(`Created ${spaceIds.length} spaces: ${spaceIds.join(', ')}`);

      // Now access anonymization fields in all spaces simultaneously
      const accessPromises = spaceIds.map((id) =>
        supertest
          .get(`/s/${id}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`)
          .set('kbn-xsrf', 'true')
          .expect(200)
      );

      await Promise.all(accessPromises);
      log.debug('Accessed anonymization fields in all spaces simultaneously');

      // Check for correct number of fields in each space
      const checkPromises = spaceIds.map(async (id) => {
        const fields = await es.search({
          index: `.kibana-elastic-ai-assistant-anonymization-fields-${id}`,
          body: {
            query: { match_all: {} },
          },
        });

        log.debug(`Space ${id} has ${fields.hits.total.value} anonymization fields`);
        expect(fields.hits.total.value).to.equal(expectedAnonymizationFieldsCount);
        return fields.hits.total.value;
      });

      const results = await Promise.all(checkPromises);

      // Verify all spaces have exactly 102 fields
      const allCorrect = results.every((count) => count === expectedAnonymizationFieldsCount);
      log.debug(`All spaces have correct field count: ${allCorrect}`);
      expect(allCorrect).to.be(true);
    });

    it('Scenario 7: Tests interleaved space creation and anonymization fields access', async () => {
      // Create a new space ID for this test
      const newSpaceId = uuid.v4();
      log.debug(
        `Testing interleaved space creation and anonymization fields access for space: ${newSpaceId}`
      );

      // Create an array of requests with space creation in the middle
      const requests = [];

      // First half of anonymization fields requests for existing space
      for (let i = 0; i < parallelRequests; i++) {
        requests.push(
          supertest
            .get(
              `/s/${spaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
            )
            .set('kbn-xsrf', 'true')
            .expect(200)
        );
      }

      // Add space creation request in the middle
      requests.push(
        supertest
          .post('/api/spaces/space')
          .set('kbn-xsrf', 'true')
          .send({
            id: newSpaceId,
            name: newSpaceId,
            disabledFeatures: [],
          })
          .expect(200)
      );

      // Add anonymization fields requests for the new space
      for (let i = 0; i < parallelRequests; i++) {
        requests.push(
          supertest
            .get(
              `/s/${newSpaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
            )
            .set('kbn-xsrf', 'true')
            .expect((response) => {
              // The first few requests might fail with 404 if the space isn't ready yet
              // That's expected and we'll allow either 200 or 404
              return response.status === 200 || response.status === 404;
            })
        );
      }

      // Execute all requests concurrently
      log.debug('Executing interleaved requests concurrently');
      try {
        await Promise.all(requests);
        log.debug('All interleaved requests completed');
      } catch (error) {
        log.debug(`Some requests failed as expected: ${error.message}`);
      }

      // Make sure the new space is properly initialized
      await supertest
        .get(
          `/s/${newSpaceId}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      log.debug('Final request to new space completed successfully');

      // Check for correct number of fields in both spaces
      const existingSpaceFields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${spaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      const newSpaceFields = await es.search({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${newSpaceId}`,
        body: {
          query: { match_all: {} },
        },
      });

      log.debug(`Existing space has ${existingSpaceFields.hits.total.value} anonymization fields`);
      log.debug(`New space has ${newSpaceFields.hits.total.value} anonymization fields`);

      expect(existingSpaceFields.hits.total.value).to.equal(102);
      expect(newSpaceFields.hits.total.value).to.equal(102);
    });
  });
}
