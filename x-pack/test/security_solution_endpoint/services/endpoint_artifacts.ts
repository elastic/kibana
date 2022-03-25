/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  CreateExceptionListSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { Response } from 'superagent';
import { FtrService } from '../../functional/ftr_provider_context';
import { ExceptionsListItemGenerator } from '../../../plugins/security_solution/common/endpoint/data_generators/exceptions_list_item_generator';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '../../../plugins/security_solution/public/management/pages/trusted_apps/constants';
import { EndpointError } from '../../../plugins/security_solution/common/endpoint/errors';
import { EVENT_FILTER_LIST_DEFINITION } from '../../../plugins/security_solution/public/management/pages/event_filters/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION } from '../../../plugins/security_solution/public/management/pages/host_isolation_exceptions/constants';
import { BLOCKLISTS_LIST_DEFINITION } from '../../../plugins/security_solution/public/management/pages/blocklist/constants';

export interface ArtifactTestData {
  artifact: ExceptionListItemSchema;
  cleanup: () => Promise<void>;
}

export class EndpointArtifactsTestResources extends FtrService {
  private readonly exceptionsGenerator = new ExceptionsListItemGenerator();
  private readonly supertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');

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

  private async ensureListExists(listDefinition: CreateExceptionListSchema): Promise<void> {
    // attempt to create it and ignore 409 (already exists) errors
    await this.supertest
      .post(EXCEPTION_LIST_URL)
      .set('kbn-xsrf', 'true')
      .send(listDefinition)
      .then(this.getHttpResponseFailureHandler([409]));
  }

  private async createExceptionItem(
    createPayload: CreateExceptionListItemSchema
  ): Promise<ArtifactTestData> {
    const artifact = await this.supertest
      .post(EXCEPTION_LIST_ITEM_URL)
      .set('kbn-xsrf', 'true')
      .send(createPayload)
      .then(this.getHttpResponseFailureHandler())
      .then((response) => response.body as ExceptionListItemSchema);

    const { item_id: itemId, namespace_type: namespaceType, list_id: listId } = artifact;

    this.log.info(`Created exception list item [${listId}]: ${itemId}`);

    const cleanup = async () => {
      const deleteResponse = await this.supertest
        .delete(`${EXCEPTION_LIST_ITEM_URL}?item_id=${itemId}&namespace_type=${namespaceType}`)
        .set('kbn-xsrf', 'true')
        .send()
        .then(this.getHttpResponseFailureHandler([404]));

      this.log.info(
        `Deleted exception list item [${listId}]: ${itemId} (${deleteResponse.status})`
      );
    };

    return {
      artifact,
      cleanup,
    };
  }

  async createTrustedApp(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): Promise<ArtifactTestData> {
    await this.ensureListExists(TRUSTED_APPS_EXCEPTION_LIST_DEFINITION);
    const trustedApp = this.exceptionsGenerator.generateTrustedAppForCreate(overrides);

    return this.createExceptionItem(trustedApp);
  }

  async createEventFilter(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): Promise<ArtifactTestData> {
    await this.ensureListExists(EVENT_FILTER_LIST_DEFINITION);
    const eventFilter = this.exceptionsGenerator.generateEventFilterForCreate(overrides);

    return this.createExceptionItem(eventFilter);
  }

  async createHostIsolationException(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): Promise<ArtifactTestData> {
    await this.ensureListExists(HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION);
    const artifact = this.exceptionsGenerator.generateHostIsolationExceptionForCreate(overrides);

    return this.createExceptionItem(artifact);
  }

  async createBlocklist(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): Promise<ArtifactTestData> {
    await this.ensureListExists(BLOCKLISTS_LIST_DEFINITION);
    const blocklist = this.exceptionsGenerator.generateBlocklistForCreate(overrides);

    return this.createExceptionItem(blocklist);
  }
}
