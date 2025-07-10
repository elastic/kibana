/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
  ENDPOINT_LIST_NAME,
  ENDPOINT_LIST_DESCRIPTION,
  ENDPOINT_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { Response } from 'superagent';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/trusted_apps/constants';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { EVENT_FILTER_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/event_filters/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/host_isolation_exceptions/constants';
import { BLOCKLISTS_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/blocklist/constants';
import { ManifestConstants } from '@kbn/security-solution-plugin/server/endpoint/lib/artifacts';
import TestAgent from 'supertest/lib/agent';
import { addSpaceIdToPath, DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { isArtifactGlobal } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { FtrService } from '../../functional/ftr_provider_context';
import { InternalUnifiedManifestSchemaResponseType } from '../apps/integrations/mocks';

export interface ArtifactTestData {
  artifact: ExceptionListItemSchema;
  cleanup: () => Promise<void>;
}

export interface ArtifactCreateOptions {
  supertest?: TestAgent;
  spaceId?: string;
}

export class EndpointArtifactsTestResources extends FtrService {
  private readonly exceptionsGenerator = new ExceptionsListItemGenerator();
  private readonly supertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');
  private readonly esClient = this.ctx.getService('es');

  private getHttpResponseFailureHandler(
    ignoredStatusCodes: number[] = []
  ): (res: Response) => Promise<Response> {
    return async (res) => {
      if (!res.ok && !ignoredStatusCodes.includes(res.status)) {
        throw new EndpointError(JSON.stringify(res.error, null, 2));
      }

      return res;
    };
  }

  private async ensureListExists(
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

  private async createExceptionItem(
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

    this.log.info(`Deleted exception list item [${listId}]: ${itemId} (${deleteResponse.status})`);
  }

  async createEndpointException(
    overrides: Partial<CreateExceptionListItemSchema> = {},
    options?: ArtifactCreateOptions
  ): Promise<ArtifactTestData> {
    await this.ensureListExists(
      {
        name: ENDPOINT_LIST_NAME,
        description: ENDPOINT_LIST_DESCRIPTION,
        list_id: ENDPOINT_LIST_ID,
        type: ExceptionListTypeEnum.ENDPOINT,
        namespace_type: 'agnostic',
      },
      options
    );
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

  async createArtifact(
    listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number] | typeof ENDPOINT_LIST_ID,
    overrides: Partial<CreateExceptionListItemSchema> = {},
    options?: ArtifactCreateOptions
  ): Promise<ArtifactTestData> {
    switch (listId) {
      case ENDPOINT_ARTIFACT_LISTS.trustedApps.id: {
        return this.createTrustedApp(overrides, options);
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
      case ENDPOINT_LIST_ID: {
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
}
