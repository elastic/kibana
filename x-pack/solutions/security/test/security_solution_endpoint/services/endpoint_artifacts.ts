/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  CreateExceptionListSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import type { Response } from 'superagent';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/trusted_apps/constants';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { EVENT_FILTER_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/event_filters/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/host_isolation_exceptions/constants';
import { BLOCKLISTS_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/blocklist/constants';
import { TRUSTED_DEVICES_EXCEPTION_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/trusted_devices/constants';
import { ManifestConstants } from '@kbn/security-solution-plugin/server/endpoint/lib/artifacts';
import type TestAgent from 'supertest/lib/agent';
import { addSpaceIdToPath, DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { isArtifactGlobal } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ENDPOINT_EXCEPTIONS_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/endpoint_exceptions/constants';
import type { FtrProviderContext } from '../configs/ftr_provider_context';
import type { InternalUnifiedManifestSchemaResponseType } from '../apps/integrations/mocks';

export interface ArtifactTestData {
  artifact: ExceptionListItemSchema;
  cleanup: () => Promise<void>;
}

export interface ArtifactCreateOptions {
  supertest?: TestAgent;
  spaceId?: string;
}

export function EndpointArtifactsTestResourcesProvider({ getService }: FtrProviderContext) {
  const supertestSv = getService('supertest');
  const log = getService('log');
  const esClient = getService('es');

  return new (class EndpointTelemetryTestResources {
    readonly supertest = supertestSv;
    readonly log = log;
    readonly esClient = esClient;
    readonly exceptionsGenerator = new ExceptionsListItemGenerator();

    getHttpResponseFailureHandler(
      ignoredStatusCodes: number[] = []
    ): (res: Response) => Promise<Response> {
      return async (res) => {
        if (!res.ok && !ignoredStatusCodes.includes(res.status)) {
          throw new EndpointError(JSON.stringify(res.error, null, 2));
        }

        return res;
      };
    }

    /**
     * Deletes an artifact list along with all of its items (if any).
     * @param listId
     * @param supertest
     */
    async deleteList(
      listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
      supertest: TestAgent = this.supertest
    ): Promise<void> {
      await supertest
        .delete(`${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`)
        .set('kbn-xsrf', 'true')
        .send()
        .then(this.getHttpResponseFailureHandler([404]));
    }

    async ensureListExists(
      listDefinition: CreateExceptionListSchema,
      { supertest = this.supertest, spaceId = DEFAULT_SPACE_ID }: ArtifactCreateOptions = {}
    ): Promise<void> {
      // attempt to create it and ignore 409 (already exists) errors
      await supertest
        .post(addSpaceIdToPath('/', spaceId, EXCEPTION_LIST_URL))
        .set('kbn-xsrf', 'true')
        .send(listDefinition)
        .then(this.getHttpResponseFailureHandler([409]));
    }

    async createExceptionItem(
      createPayload: CreateExceptionListItemSchema,
      { supertest = this.supertest, spaceId = DEFAULT_SPACE_ID }: ArtifactCreateOptions = {}
    ): Promise<ArtifactTestData> {
      this.log.verbose(`Creating exception item:\n${JSON.stringify(createPayload)}`);

      const artifact = await supertest
        .post(addSpaceIdToPath('/', spaceId, EXCEPTION_LIST_ITEM_URL))
        .set('kbn-xsrf', 'true')
        .send(createPayload)
        .then(this.getHttpResponseFailureHandler())
        .then((response) => response.body as ExceptionListItemSchema);

      const { item_id: itemId, list_id: listId } = artifact;
      const artifactAssignment = isArtifactGlobal(artifact) ? 'Global' : 'Per-Policy';

      this.log.info(
        `Created [${artifactAssignment}] exception list item in space [${spaceId}], List ID [${listId}], Item ID [${itemId}]`
      );

      const cleanup = async () => {
        await this.deleteExceptionItem(artifact, { supertest, spaceId });
      };

      return {
        artifact,
        cleanup,
      };
    }

    async deleteExceptionItem(
      {
        list_id: listId,
        item_id: itemId,
        namespace_type: nameSpaceType,
      }: Pick<ExceptionListItemSchema, 'list_id' | 'item_id' | 'namespace_type'>,
      { supertest = this.supertest, spaceId = DEFAULT_SPACE_ID }: ArtifactCreateOptions = {}
    ): Promise<void> {
      const deleteResponse = await supertest
        .delete(
          `${addSpaceIdToPath(
            '/',
            spaceId,
            EXCEPTION_LIST_ITEM_URL
          )}?item_id=${itemId}&namespace_type=${nameSpaceType}`
        )
        .set('kbn-xsrf', 'true')
        .send()
        .then(this.getHttpResponseFailureHandler([404]));

      this.log.info(
        `Deleted exception list item [${listId}]: ${itemId} (${deleteResponse.status})`
      );
    }

    async createEndpointException(
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      await this.ensureListExists(ENDPOINT_EXCEPTIONS_LIST_DEFINITION, options);
      const endpointException =
        this.exceptionsGenerator.generateEndpointExceptionForCreate(overrides);

      return this.createExceptionItem(endpointException, options);
    }

    async createTrustedApp(
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      await this.ensureListExists(TRUSTED_APPS_EXCEPTION_LIST_DEFINITION, options);
      const trustedApp = this.exceptionsGenerator.generateTrustedAppForCreate(overrides);

      return this.createExceptionItem(trustedApp, options);
    }

    async createEventFilter(
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      await this.ensureListExists(EVENT_FILTER_LIST_DEFINITION, options);
      const eventFilter = this.exceptionsGenerator.generateEventFilterForCreate(overrides);

      return this.createExceptionItem(eventFilter, options);
    }

    async createHostIsolationException(
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      await this.ensureListExists(HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION, options);
      const artifact = this.exceptionsGenerator.generateHostIsolationExceptionForCreate(overrides);

      return this.createExceptionItem(artifact, options);
    }

    async createBlocklist(
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      await this.ensureListExists(BLOCKLISTS_LIST_DEFINITION, options);
      const blocklist = this.exceptionsGenerator.generateBlocklistForCreate(overrides);

      return this.createExceptionItem(blocklist, options);
    }

    async createTrustedDevice(
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      await this.ensureListExists(TRUSTED_DEVICES_EXCEPTION_LIST_DEFINITION, options);
      const trustedDevice = this.exceptionsGenerator.generateTrustedDeviceForCreate(overrides);

      return this.createExceptionItem(trustedDevice, options);
    }

    async createArtifact(
      listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
      overrides: Partial<CreateExceptionListItemSchema> = {},
      options?: ArtifactCreateOptions
    ): Promise<ArtifactTestData> {
      switch (listId) {
        case ENDPOINT_ARTIFACT_LISTS.trustedApps.id: {
          return this.createTrustedApp(overrides, options);
        }
        case ENDPOINT_ARTIFACT_LISTS.trustedDevices.id: {
          return this.createTrustedDevice(overrides, options);
        }
        case ENDPOINT_ARTIFACT_LISTS.eventFilters.id: {
          return this.createEventFilter(overrides, options);
        }
        case ENDPOINT_ARTIFACT_LISTS.blocklists.id: {
          return this.createBlocklist(overrides, options);
        }
        case ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id: {
          return this.createHostIsolationException(overrides, options);
        }
        case ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id: {
          return this.createEndpointException(overrides, options);
        }
        default:
          throw new Error(`Unexpected list id ${listId}`);
      }
    }

    async getArtifactsFromUnifiedManifestSO(): Promise<
      Array<
        InternalUnifiedManifestSchemaResponseType['_source']['endpoint:unified-user-artifact-manifest']
      >
    > {
      const {
        hits: { hits: manifestResults },
      } = await this.esClient.search<InternalUnifiedManifestSchemaResponseType['_source']>({
        index: '.kibana*',
        query: {
          bool: { filter: [{ term: { type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE } }] },
        },
      });

      return manifestResults.map(
        (result) => result._source!['endpoint:unified-user-artifact-manifest']
      );
    }
  })();
}
