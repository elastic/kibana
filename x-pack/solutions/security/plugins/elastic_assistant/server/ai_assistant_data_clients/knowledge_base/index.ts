/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTotalHits, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { Document } from '@langchain/core/documents';
import type {
  DocumentEntry,
  IndexEntry,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  Metadata,
  ContentReferencesStore,
  KnowledgeBaseEntryUpdateProps,
} from '@kbn/elastic-assistant-common';
import { DocumentEntryType } from '@kbn/elastic-assistant-common';
import pRetry from 'p-retry';
import type { StructuredTool } from '@langchain/core/tools';
import type {
  AnalyticsServiceSetup,
  AuditLogger,
  ElasticsearchClient,
  IScopedClusterClient,
} from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import { map } from 'lodash';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import type { TrainedModelsProvider } from '@kbn/ml-plugin/server/shared_services/providers';
import { getMlNodeCount } from '@kbn/ml-plugin/server/lib/node_utils';
import type { AIAssistantDataClientParams } from '..';
import { AIAssistantDataClient } from '..';
import type { GetElser } from '../../types';
import {
  createKnowledgeBaseEntry,
  getUpdateScript,
  transformToCreateSchema,
  transformToUpdateSchema,
} from './create_knowledge_base_entry';
import type {
  EsDocumentEntry,
  EsIndexEntry,
  EsKnowledgeBaseEntrySchema,
  UpdateKnowledgeBaseEntrySchema,
} from './types';
import { transformESSearchToKnowledgeBaseEntry, transformESToKnowledgeBase } from './transforms';
import {
  SECURITY_LABS_RESOURCE,
  USER_RESOURCE,
  DEFEND_INSIGHTS_RESOURCES,
} from '../../routes/knowledge_base/constants';
import {
  getKBVectorSearchQuery,
  getStructuredToolForIndexEntry,
  isModelAlreadyExistsError,
} from './helpers';
import {
  getKBUserFilter,
  isGlobalEntry,
  validateDocumentsModification,
} from '../../routes/knowledge_base/entries/utils';
import {
  loadSecurityLabs,
  getSecurityLabsDocsCount,
} from '../../lib/langchain/content_loaders/security_labs_loader';
import {
  getDefendInsightsDocsCount,
  loadDefendInsights,
} from '../../lib/langchain/content_loaders/defend_insights_loader';
import type { BulkOperationError } from '../../lib/data_stream/documents_data_writer';
import { AUDIT_OUTCOME, KnowledgeBaseAuditAction, knowledgeBaseAuditEvent } from './audit_events';
import {
  createInferenceEndpoint,
  getInferenceEndpointId,
  isInferenceEndpointExists,
} from './ensure_dedicated_inference_endpoint';

export {
  createInferenceEndpoint,
  deleteInferenceEndpoint,
  dryRunTrainedModelDeployment,
  ensureDedicatedInferenceEndpoint,
  getInferenceEndpointId,
  hasDedicatedInferenceEndpointIndexEntries,
  isInferenceEndpointExists,
} from './ensure_dedicated_inference_endpoint';

/**
 * Params for when creating KbDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface GetAIAssistantKnowledgeBaseDataClientParams {
  elserInferenceId?: string;
  manageGlobalKnowledgeBaseAIAssistant?: boolean;
}

export interface KnowledgeBaseDataClientParams extends AIAssistantDataClientParams {
  ml: MlPluginSetup;
  getElserId: GetElser;
  getIsKBSetupInProgress: (spaceId: string) => boolean;
  getProductDocumentationStatus: () => Promise<InstallationStatus>;
  ingestPipelineResourceName: string;
  setIsKBSetupInProgress: (spaceId: string, isInProgress: boolean) => void;
  manageGlobalKnowledgeBaseAIAssistant: boolean;
  getTrainedModelsProvider: () => ReturnType<TrainedModelsProvider['trainedModelsProvider']>;
  elserInferenceId?: string;
}
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
  constructor(public readonly options: KnowledgeBaseDataClientParams) {
    super(options);
  }

  public get isSetupInProgress() {
    return this.options.getIsKBSetupInProgress(this.spaceId);
  }

  public getProductDocumentationStatus = async () => {
    return (await this.options.getProductDocumentationStatus()) ?? 'uninstalled';
  };

  /**
   * Returns whether setup of the Knowledge Base can be performed (essentially an ML features check)
   *
   */
  public isSetupAvailable = async () => {
    // ML plugin requires request to retrieve capabilities, which are in turn scoped to the user from the request,
    // so we just test the API for a 404 instead to determine if ML is 'available'
    // TODO: expand to include memory check, see https://github.com/elastic/ml-team/issues/1208#issuecomment-2115770318
    try {
      const esClient = await this.options.elasticsearchClientPromise;
      await esClient.ml.getMemoryStats({ human: true });
    } catch (error) {
      return false;
    }
    return true;
  };

  /**
   * Downloads and installs ELSER model if not already installed
   */
  private installModel = async () => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Installing ELSER model '${elserId}'...`);

    try {
      await this.options.getTrainedModelsProvider().installElasticModel(elserId);
    } catch (error) {
      this.options.logger.error(`Error installing ELSER model '${elserId}':\n${error}`);
    }
  };

  /**
   * Returns whether ELSER is installed/ready to deploy
   *
   * @returns Promise<boolean> indicating whether the model is installed
   */
  public isModelInstalled = async (): Promise<boolean> => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Checking if ELSER model '${elserId}' is installed...`);

    try {
      const getResponse = await this.options.getTrainedModelsProvider().getTrainedModels({
        model_id: elserId,
        include: 'definition_status',
      });
      return Boolean(getResponse.trained_model_configs[0]?.fully_defined);
    } catch (error) {
      if (!isModelAlreadyExistsError(error)) {
        this.options.logger.error(
          `Error checking if ELSER model '${elserId}' is installed:\n${error}`
        );
      }
      return false;
    }
  };

  public isInferenceEndpointExists = async (): Promise<boolean> =>
    isInferenceEndpointExists({
      esClient: await this.options.elasticsearchClientPromise,
      logger: this.options.logger,
      getTrainedModelsProvider: this.options.getTrainedModelsProvider,
    });

  public createInferenceEndpoint = async (): Promise<void> => {
    const esClient = await this.options.elasticsearchClientPromise;

    await createInferenceEndpoint({
      elserId: await this.options.getElserId(),
      esClient,
      logger: this.options.logger,
      inferenceId: await getInferenceEndpointId({ esClient }),
      getTrainedModelsProvider: this.options.getTrainedModelsProvider,
    });
  };

  /**
   * Downloads and deploys recommended ELSER (if not already), then loads ES|QL docs
   *
   * NOTE: Before automatically installing ELSER in the background, we should perform deployment resource checks
   * Only necessary for ESS, as Serverless can always auto-install if `productTier === complete`
   * See ml-team issue for providing 'dry run' flag to perform these checks: https://github.com/elastic/ml-team/issues/1208
   *
   * @param options
   * @param options.soClient SavedObjectsClientContract for installing ELSER so that ML SO's are in sync
   *
   * @returns Promise<void>
   */
  public setupKnowledgeBase = async ({
    ignoreSecurityLabs = false,
  }: {
    ignoreSecurityLabs?: boolean;
  }): Promise<void> => {
    const elserId = await this.options.getElserId();
    const esClient = await this.options.elasticsearchClientPromise;

    if (this.options.getIsKBSetupInProgress(this.spaceId)) {
      this.options.logger.debug('Knowledge Base setup already in progress');
      return;
    }

    try {
      this.options.logger.debug('Checking if ML nodes are available...');
      const mlNodesCount = await getMlNodeCount({
        asInternalUser: esClient,
      } as IScopedClusterClient);

      if (mlNodesCount.count === 0 && mlNodesCount.lazyNodeCount === 0) {
        throw new Error('No ML nodes available');
      }

      this.options.logger.debug('Starting Knowledge Base setup...');
      this.options.setIsKBSetupInProgress(this.spaceId, true);

      // Delete legacy ESQL knowledge base docs if they exist, and silence the error if they do not
      try {
        const legacyESQL = await esClient.deleteByQuery({
          index: this.indexTemplateAndPattern.alias,
          query: {
            bool: {
              must: [{ terms: { 'metadata.kbResource': ['esql', 'unknown'] } }],
            },
          },
        });
        if (legacyESQL?.total != null && legacyESQL?.total > 0) {
          this.options.logger.info(
            `Removed ${legacyESQL?.total} ESQL knowledge base docs from knowledge base data stream: ${this.indexTemplateAndPattern.alias}.`
          );
        }
      } catch (e) {
        this.options.logger.info('No legacy ESQL or Security Labs knowledge base docs to delete');
      }

      // `pt_tiny_elser` is deployed before the KB setup is started, so we don't need to check for it
      if (!this.options.elserInferenceId) {
        /*
        #1 Check if ELSER model is downloaded
        #2 Check if inference endpoint is deployed
        #3 Dry run ELSER model deployment if not already deployed
        #4 Create inference endpoint if not deployed / delete and create inference endpoint if model was not deployed
        #5 Load Security Labs docs
      */
        const isInstalled = await this.isModelInstalled();
        if (!isInstalled) {
          await this.installModel();
          await pRetry(
            async () =>
              (await this.isModelInstalled())
                ? Promise.resolve()
                : Promise.reject(new Error('Model not installed')),
            { minTimeout: 30000, maxTimeout: 30000, retries: 20 }
          );
          this.options.logger.debug(`ELSER model '${elserId}' successfully installed!`);
        } else {
          this.options.logger.debug(`ELSER model '${elserId}' is already installed`);
        }

        const inferenceId = await getInferenceEndpointId({
          esClient,
        });

        const inferenceExists = await isInferenceEndpointExists({
          esClient,
          inferenceEndpointId: inferenceId,
          getTrainedModelsProvider: this.options.getTrainedModelsProvider,
          logger: this.options.logger,
        });

        if (!inferenceExists) {
          await createInferenceEndpoint({
            elserId,
            esClient,
            logger: this.options.logger,
            inferenceId,
            getTrainedModelsProvider: this.options.getTrainedModelsProvider,
          });

          this.options.logger.debug(
            `Inference endpoint for ELSER model '${elserId}' successfully deployed!`
          );
        } else {
          this.options.logger.debug(
            `Inference endpoint for ELSER model '${elserId}' is already deployed`
          );
        }
      }

      const docLoaderPromises: Array<Promise<boolean>> = [];

      if (!ignoreSecurityLabs) {
        this.options.logger.debug(`Checking if Knowledge Base docs have been loaded...`);

        const labsDocsLoaded = await this.isSecurityLabsDocsLoaded();
        if (!labsDocsLoaded) {
          // Delete any existing Security Labs content
          const securityLabsDocs = await (
            await this.options.elasticsearchClientPromise
          ).deleteByQuery({
            index: this.indexTemplateAndPattern.alias,
            query: {
              bool: {
                must: [{ terms: { kb_resource: [SECURITY_LABS_RESOURCE] } }],
              },
            },
          });

          if (securityLabsDocs?.total) {
            this.options.logger.info(
              `Removed ${securityLabsDocs?.total} Security Labs knowledge base docs from knowledge base data stream: ${this.indexTemplateAndPattern.alias}.`
            );
          }

          this.options.logger.debug(`Loading Security Labs KB docs...`);

          docLoaderPromises.push(loadSecurityLabs(this, this.options.logger));
        } else {
          this.options.logger.debug(`Security Labs Knowledge Base docs already loaded!`);
        }
      }

      // Load Defend Insights docs if not already loaded
      this.options.logger.debug(`Checking if Defend Insights docs have been loaded...`);
      const defendInsightsDocsLoaded = await this.isDefendInsightsDocsLoaded();
      if (!defendInsightsDocsLoaded) {
        // Delete any existing Defend Insights content
        const defendInsightsDocs = await (
          await this.options.elasticsearchClientPromise
        ).deleteByQuery({
          index: this.indexTemplateAndPattern.alias,
          query: {
            bool: {
              must: [
                {
                  bool: {
                    must: [{ prefix: { kb_resource: DEFEND_INSIGHTS_RESOURCES } }],
                  },
                },
              ],
            },
          },
        });

        if (defendInsightsDocs?.total) {
          this.options.logger.info(
            `Removed ${defendInsightsDocs?.total} Defend Insights knowledge base docs from knowledge base data stream: ${this.indexTemplateAndPattern.alias}.`
          );
        }

        this.options.logger.debug(`Loading Defend Insights KB docs...`);
        docLoaderPromises.push(loadDefendInsights(this, this.options.logger));
      } else {
        this.options.logger.debug(`Defend Insights Knowledge Base docs already loaded!`);
      }

      if (docLoaderPromises.length > 0) {
        void Promise.all(docLoaderPromises).then(() => {
          this.options.setIsKBSetupInProgress(this.spaceId, false);
        });
      }

      // If loading security labs, we need to wait for the docs to be loaded
      if (ignoreSecurityLabs) {
        this.options.setIsKBSetupInProgress(this.spaceId, false);
      }
    } catch (e) {
      this.options.setIsKBSetupInProgress(this.spaceId, false);
      this.options.logger.error(`Error setting up Knowledge Base: ${e.message}`);
      throw new Error(`Error setting up Knowledge Base: ${e.message}`);
    }
  };

  // TODO make this function private
  // no telemetry, no audit logs
  /**
   * Adds LangChain Documents to the knowledge base
   *
   * @param {Array<Document<Metadata>>} documents - LangChain Documents to add to the knowledge base
   * @param global whether these entries should be added globally, i.e. empty users[]
   */
  public addKnowledgeBaseDocuments = async ({
    documents,
    global = false,
  }: {
    documents: Array<Document<Metadata>>;
    global?: boolean;
  }): Promise<KnowledgeBaseEntryResponse[]> => {
    const writer = await this.getWriter();
    const changedAt = new Date().toISOString();
    const authenticatedUser = this.options.currentUser;
    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    if (global && !this.options.manageGlobalKnowledgeBaseAIAssistant) {
      throw new Error('User lacks privileges to create global knowledge base entries');
    }

    const { errors, docs_created: docsCreated } = await writer.bulk({
      documentsToCreate: documents.map((doc) => {
        // v1 schema has metadata nested in a `metadata` object
        return transformToCreateSchema({
          createdAt: changedAt,
          spaceId: this.spaceId,
          user: authenticatedUser,
          entry: {
            type: DocumentEntryType.value,
            name: 'unknown',
            text: doc.pageContent,
            kbResource: doc.metadata.kbResource ?? 'unknown',
            required: doc.metadata.required ?? false,
            source: doc.metadata.source ?? 'unknown',
            global,
          },
        });
      }),
      authenticatedUser,
    });
    const created =
      docsCreated.length > 0
        ? await this.findDocuments<EsKnowledgeBaseEntrySchema>({
            page: 1,
            perPage: 10000,
            filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
          })
        : undefined;
    // Intentionally no telemetry here - this path only used to install security docs
    // Plans to make this function private in a different PR so no user entry ever is created in this path
    this.options.logger.debug(`created: ${created?.data.hits.hits.length ?? '0'}`);
    this.options.logger.debug(() => `errors: ${JSON.stringify(errors, null, 2)}`);

    return created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [];
  };

  /**
   * Returns if user's KB docs exists
   */

  public isUserDataExists = async (): Promise<boolean> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const vectorSearchQuery = getKBVectorSearchQuery({
        kbResource: USER_RESOURCE,
        required: false,
        user,
      });

      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 0,
        query: vectorSearchQuery,
        track_total_hits: true,
      });

      return !!(result.hits?.total as SearchTotalHits).value;
    } catch (e) {
      this.options.logger.debug(`Error checking if user's KB docs exist: ${e.message}`);
      return false;
    }
  };

  /**
   * Returns loaded Security Labs KB docs count
   */
  public getLoadedSecurityLabsDocsCount = async (): Promise<number> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const vectorSearchQuery = getKBVectorSearchQuery({
        kbResource: SECURITY_LABS_RESOURCE,
        required: false,
        user,
      });

      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 0,
        query: vectorSearchQuery,
        track_total_hits: true,
      });

      return (result.hits?.total as SearchTotalHits).value;
    } catch (e) {
      this.options.logger.info(`Error checking if Security Labs docs are loaded: ${e.message}`);
      return 0;
    }
  };

  /**
   * Returns loaded Defend Insights KB docs count
   */
  public getLoadedDefendInsightsDocsCount = async (): Promise<number> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const response = await esClient.count({
        index: this.indexTemplateAndPattern.alias,
        query: {
          bool: {
            must: [
              {
                bool: {
                  must: [{ prefix: { kb_resource: DEFEND_INSIGHTS_RESOURCES } }],
                },
              },
            ],
          },
        },
      });

      return response.count ?? 0;
    } catch (e) {
      this.options.logger.info(`Error checking if Defend Insights docs are loaded: ${e.message}`);
      return 0;
    }
  };

  /**
   * Returns if allSecurity Labs KB docs have been loaded
   */
  public isSecurityLabsDocsLoaded = async (): Promise<boolean> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const expectedDocsCount = await getSecurityLabsDocsCount({ logger: this.options.logger });
      const existingDocs = await this.getLoadedSecurityLabsDocsCount();

      if (existingDocs !== expectedDocsCount) {
        this.options.logger.debug(
          `Security Labs docs are not loaded, existing docs: ${existingDocs}, expected docs: ${expectedDocsCount}`
        );
      }
      return existingDocs === expectedDocsCount;
    } catch (e) {
      this.options.logger.info(`Error checking if Security Labs docs are loaded: ${e.message}`);
      return false;
    }
  };

  /**
   * Returns if all Defend Insights KB docs have been loaded
   */
  public isDefendInsightsDocsLoaded = async (): Promise<boolean> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const expectedDocsCount = await getDefendInsightsDocsCount({ logger: this.options.logger });
      const existingDocs = await this.getLoadedDefendInsightsDocsCount();

      if (existingDocs !== expectedDocsCount) {
        this.options.logger.debug(
          `Defend insights docs are not loaded, existing docs: ${existingDocs}, expected docs: ${expectedDocsCount}`
        );
      }
      return existingDocs === expectedDocsCount;
    } catch (e) {
      this.options.logger.info(`Error checking if Defend insights docs are loaded: ${e.message}`);
      return false;
    }
  };

  /**
   * Performs similarity search to retrieve LangChain Documents from the knowledge base
   */
  public getKnowledgeBaseDocumentEntries = async ({
    filter,
    kbResource,
    query,
    required,
  }: {
    filter?: QueryDslQueryContainer;
    kbResource?: string;
    query: string;
    required?: boolean;
  }): Promise<Document[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const esClient = await this.options.elasticsearchClientPromise;

    const vectorSearchQuery = getKBVectorSearchQuery({
      filter,
      kbResource,
      query,
      required,
      user,
    });

    try {
      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 10,
        query: vectorSearchQuery,
      });

      const results = result.hits.hits.map((hit) => {
        const metadata = {
          name: hit?._source?.name,
          index: hit?._index,
          source: hit?._source?.source,
          required: hit?._source?.required,
          kbResource: hit?._source?.kb_resource,
        };
        return new Document({
          id: hit?._id,
          pageContent: hit?._source?.text ?? '',
          metadata,
        });
      });

      this.options.logger.debug(
        () =>
          `getKnowledgeBaseDocuments() - Similarity Search Query:\n ${JSON.stringify(
            vectorSearchQuery
          )}`
      );
      this.options.logger.debug(
        () =>
          `getKnowledgeBaseDocuments() - Similarity Search returned [${JSON.stringify(
            results.length
          )}] results`
      );

      return results;
    } catch (e) {
      this.options.logger.error(`Error performing KB Similarity Search: ${e.message}`);
      return [];
    }
  };

  /**
   * Returns all global and current user's private `required` document entries.
   */
  public getRequiredKnowledgeBaseDocumentEntries = async (): Promise<DocumentEntry[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const userFilter = getKBUserFilter(user);
      const results = await this.findDocuments<EsIndexEntry>({
        // Note: This is a magic number to set some upward bound as to not blow the context with too
        // many historical KB entries. Ideally we'd query for all and token trim.
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: `${userFilter} AND type:document AND kb_resource:user AND required:true`,
      });
      this.options.logger.debug(
        `kbDataClient.getRequiredKnowledgeBaseDocumentEntries() - results:\n${JSON.stringify(
          results
        )}`
      );

      if (results) {
        return transformESSearchToKnowledgeBaseEntry(results.data) as DocumentEntry[];
      }
    } catch (e) {
      this.options.logger.error(
        `kbDataClient.getRequiredKnowledgeBaseDocumentEntries() - Failed to fetch DocumentEntries`
      );
      return [];
    }

    return [];
  };

  /**
   * Creates a new Knowledge Base Entry.
   *
   * @param knowledgeBaseEntry
   * @param global
   */
  public createKnowledgeBaseEntry = async ({
    auditLogger,
    knowledgeBaseEntry,
    telemetry,
  }: {
    auditLogger?: AuditLogger;
    knowledgeBaseEntry: KnowledgeBaseEntryCreateProps;
    telemetry: AnalyticsServiceSetup;
  }): Promise<KnowledgeBaseEntryResponse | null> => {
    const authenticatedUser = this.options.currentUser;

    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    if (isGlobalEntry(knowledgeBaseEntry) && !this.options.manageGlobalKnowledgeBaseAIAssistant) {
      throw new Error('User lacks privileges to create global knowledge base entries');
    }

    this.options.logger.debug(
      () => `Creating Knowledge Base Entry:\n ${JSON.stringify(knowledgeBaseEntry, null, 2)}`
    );
    this.options.logger.debug(`kbIndex: ${this.indexTemplateAndPattern.alias}`);
    const esClient = await this.options.elasticsearchClientPromise;
    return createKnowledgeBaseEntry({
      auditLogger,
      esClient,
      knowledgeBaseIndex: this.indexTemplateAndPattern.alias,
      logger: this.options.logger,
      spaceId: this.spaceId,
      user: authenticatedUser,
      knowledgeBaseEntry,
      telemetry,
    });
  };

  /**
   * Updates a Knowledge Base Entry.
   *
   * @param auditLogger
   * @param knowledgeBaseEntryId
   */
  public updateKnowledgeBaseEntry = async ({
    auditLogger,
    knowledgeBaseEntry,
    telemetry,
  }: {
    auditLogger?: AuditLogger;
    knowledgeBaseEntry: KnowledgeBaseEntryUpdateProps;
    telemetry: AnalyticsServiceSetup;
  }): Promise<{
    errors: BulkOperationError[];
    updatedEntry: KnowledgeBaseEntryResponse | null | undefined;
  }> => {
    const authenticatedUser = this.options.currentUser;

    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    await validateDocumentsModification(this, authenticatedUser, [knowledgeBaseEntry.id], 'update');

    this.options.logger.debug(
      () => `Updating Knowledge Base Entry:\n ${JSON.stringify(knowledgeBaseEntry, null, 2)}`
    );
    this.options.logger.debug(`kbIndex: ${this.indexTemplateAndPattern.alias}`);

    const writer = await this.getWriter();
    const changedAt = new Date().toISOString();
    const { errors, docs_updated: docsUpdated } = await writer.bulk({
      documentsToUpdate: [
        transformToUpdateSchema({
          user: authenticatedUser,
          updatedAt: changedAt,
          entry: knowledgeBaseEntry,
        }),
      ],
      getUpdateScript: (entry: UpdateKnowledgeBaseEntrySchema) => getUpdateScript({ entry }),
      authenticatedUser,
    });

    // @ts-ignore-next-line TS2322
    const updatedEntry = transformESToKnowledgeBase(docsUpdated)?.[0];

    if (updatedEntry) {
      auditLogger?.log(
        knowledgeBaseAuditEvent({
          action: KnowledgeBaseAuditAction.UPDATE,
          id: updatedEntry.id,
          name: updatedEntry.name,
          outcome: AUDIT_OUTCOME.SUCCESS,
        })
      );
    }

    return { errors, updatedEntry };
  };

  /**
   * Deletes a new Knowledge Base Entry.
   *
   * @param auditLogger
   * @param knowledgeBaseEntryId
   */
  public deleteKnowledgeBaseEntry = async ({
    auditLogger,
    knowledgeBaseEntryId,
  }: {
    auditLogger?: AuditLogger;
    knowledgeBaseEntryId: string;
  }): Promise<{ errors: BulkOperationError[]; docsDeleted: string[] } | null> => {
    const authenticatedUser = this.options.currentUser;

    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    await validateDocumentsModification(this, authenticatedUser, [knowledgeBaseEntryId], 'delete');

    this.options.logger.debug(
      () => `Deleting Knowledge Base Entry:\n ID: ${JSON.stringify(knowledgeBaseEntryId, null, 2)}`
    );
    this.options.logger.debug(`kbIndex: ${this.indexTemplateAndPattern.alias}`);

    const writer = await this.getWriter();
    const { errors, docs_deleted: docsDeleted } = await writer.bulk({
      documentsToDelete: [knowledgeBaseEntryId],
      authenticatedUser,
    });

    if (docsDeleted.length) {
      docsDeleted.forEach((docsDeletedId) => {
        auditLogger?.log(
          knowledgeBaseAuditEvent({
            action: KnowledgeBaseAuditAction.DELETE,
            id: docsDeletedId,
            outcome: AUDIT_OUTCOME.SUCCESS,
          })
        );
      });
    }

    return { errors, docsDeleted };
  };

  /**
   * Returns AssistantTools for any 'relevant' KB IndexEntries that exist in the knowledge base.
   *
   * Note: Accepts esClient so retrieval can be scoped to the current user as esClient on kbDataClient
   * is scoped to system user.
   */
  public getAssistantTools = async ({
    contentReferencesStore,
    esClient,
  }: {
    contentReferencesStore: ContentReferencesStore;
    esClient: ElasticsearchClient;
  }): Promise<StructuredTool[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const userFilter = getKBUserFilter(user);
      const results = await this.findDocuments<EsIndexEntry>({
        // Note: This is a magic number to set some upward bound as to not blow the context with too
        // many registered tools. As discussed in review, this will initially be mitigated by caps on
        // the IndexEntries field lengths, context trimming at the graph layer (before compilation),
        // and eventually some sort of tool discovery sub-graph or generic retriever to scale tool usage.
        perPage: 23,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: `${userFilter} AND type:index`,
      });
      this.options.logger.debug(
        `kbDataClient.getAssistantTools() - results:\n${JSON.stringify(results, null, 2)}`
      );

      if (results) {
        const entries = transformESSearchToKnowledgeBaseEntry(results.data) as IndexEntry[];
        const indexPatternFetcher = new IndexPatternsFetcher(esClient);
        const { matchedIndexPatterns } = await indexPatternFetcher.getIndexPatternMatches(
          map(entries, 'index')
        );
        return (
          entries
            // Filter out any IndexEntries that don't have an existing index
            .filter((entry) => matchedIndexPatterns.includes(entry.index))
            .map((indexEntry) => {
              return getStructuredToolForIndexEntry({
                indexEntry,
                esClient,
                logger: this.options.logger,
                contentReferencesStore,
              });
            })
        );
      }
    } catch (e) {
      this.options.logger.error(`kbDataClient.getAssistantTools() - Failed to fetch IndexEntries`);
      return [];
    }

    return [];
  };
}
