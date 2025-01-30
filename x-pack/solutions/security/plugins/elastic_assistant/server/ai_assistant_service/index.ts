/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamSpacesAdapter, FieldMap } from '@kbn/data-stream-adapter';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { AuthenticatedUser, Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { Subject } from 'rxjs';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import {
  IndicesGetFieldMappingResponse,
  IndicesIndexSettings,
} from '@elastic/elasticsearch/lib/api/types';
import { omit } from 'lodash';
import { attackDiscoveryFieldMap } from '../lib/attack_discovery/persistence/field_maps_configuration/field_maps_configuration';
import { defendInsightsFieldMap } from '../ai_assistant_data_clients/defend_insights/field_maps_configuration';
import { getDefaultAnonymizationFields } from '../../common/anonymization';
import { AssistantResourceNames, GetElser } from '../types';
import {
  AIAssistantConversationsDataClient,
  GetAIAssistantConversationsDataClientParams,
} from '../ai_assistant_data_clients/conversations';
import {
  InitializationPromise,
  ResourceInstallationHelper,
  createResourceInstallationHelper,
  errorResult,
  successResult,
} from './create_resource_installation_helper';
import {
  conversationsFieldMap,
  conversationsContentReferencesFieldMap,
} from '../ai_assistant_data_clients/conversations/field_maps_configuration';
import { assistantPromptsFieldMap } from '../ai_assistant_data_clients/prompts/field_maps_configuration';
import { assistantAnonymizationFieldsFieldMap } from '../ai_assistant_data_clients/anonymization_fields/field_maps_configuration';
import { AIAssistantDataClient } from '../ai_assistant_data_clients';
import {
  ASSISTANT_ELSER_INFERENCE_ID,
  ELASTICSEARCH_ELSER_INFERENCE_ID,
  knowledgeBaseFieldMap,
} from '../ai_assistant_data_clients/knowledge_base/field_maps_configuration';
import {
  AIAssistantKnowledgeBaseDataClient,
  GetAIAssistantKnowledgeBaseDataClientParams,
} from '../ai_assistant_data_clients/knowledge_base';
import { AttackDiscoveryDataClient } from '../lib/attack_discovery/persistence';
import { DefendInsightsDataClient } from '../ai_assistant_data_clients/defend_insights';
import { createGetElserId, ensureProductDocumentationInstalled } from './helpers';
import { hasAIAssistantLicense } from '../routes/helpers';

const TOTAL_FIELDS_LIMIT = 2500;

export function getResourceName(resource: string) {
  return `.kibana-elastic-ai-assistant-${resource}`;
}

export interface AIAssistantServiceOpts {
  logger: Logger;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  ml: MlPluginSetup;
  taskManager: TaskManagerSetupContract;
  pluginStop$: Subject<void>;
  productDocManager: Promise<ProductDocBaseStartContract['management']>;
}

export interface CreateAIAssistantClientParams {
  logger: Logger;
  spaceId: string;
  currentUser: AuthenticatedUser | null;
  licensing: Promise<LicensingApiRequestHandlerContext>;
}

export type CreateDataStream = (params: {
  resource:
    | 'anonymizationFields'
    | 'conversations'
    | 'knowledgeBase'
    | 'prompts'
    | 'attackDiscovery'
    | 'defendInsights';
  fieldMap: FieldMap;
  kibanaVersion: string;
  spaceId?: string;
  settings?: IndicesIndexSettings;
  writeIndexOnly?: boolean;
}) => DataStreamSpacesAdapter;

export class AIAssistantService {
  private initialized: boolean;
  private isInitializing: boolean = false;
  private getElserId: GetElser;
  private conversationsDataStream: DataStreamSpacesAdapter;
  private knowledgeBaseDataStream: DataStreamSpacesAdapter;
  private promptsDataStream: DataStreamSpacesAdapter;
  private anonymizationFieldsDataStream: DataStreamSpacesAdapter;
  private attackDiscoveryDataStream: DataStreamSpacesAdapter;
  private defendInsightsDataStream: DataStreamSpacesAdapter;
  private resourceInitializationHelper: ResourceInstallationHelper;
  private initPromise: Promise<InitializationPromise>;
  private isKBSetupInProgress: boolean = false;
  private hasInitializedV2KnowledgeBase: boolean = false;
  private productDocManager?: ProductDocBaseStartContract['management'];
  // Temporary 'feature flag' to determine if we should initialize the new message metadata mappings, toggled when citations should be enabled.
  private contentReferencesEnabled: boolean = false;
  private hasInitializedContentReferences: boolean = false;
  // Temporary 'feature flag' to determine if we should initialize the new knowledge base mappings
  private assistantDefaultInferenceEndpoint: boolean = false;

  constructor(private readonly options: AIAssistantServiceOpts) {
    this.initialized = false;
    this.getElserId = createGetElserId(options.ml.trainedModelsProvider);
    this.conversationsDataStream = this.createDataStream({
      resource: 'conversations',
      kibanaVersion: options.kibanaVersion,
      fieldMap: conversationsFieldMap,
    });
    this.knowledgeBaseDataStream = this.createDataStream({
      resource: 'knowledgeBase',
      kibanaVersion: options.kibanaVersion,
      fieldMap: knowledgeBaseFieldMap,
    });
    this.promptsDataStream = this.createDataStream({
      resource: 'prompts',
      kibanaVersion: options.kibanaVersion,
      fieldMap: assistantPromptsFieldMap,
    });
    this.anonymizationFieldsDataStream = this.createDataStream({
      resource: 'anonymizationFields',
      kibanaVersion: options.kibanaVersion,
      fieldMap: assistantAnonymizationFieldsFieldMap,
    });
    this.attackDiscoveryDataStream = this.createDataStream({
      resource: 'attackDiscovery',
      kibanaVersion: options.kibanaVersion,
      fieldMap: attackDiscoveryFieldMap,
    });
    this.defendInsightsDataStream = this.createDataStream({
      resource: 'defendInsights',
      kibanaVersion: options.kibanaVersion,
      fieldMap: defendInsightsFieldMap,
    });

    this.initPromise = this.initializeResources();

    this.resourceInitializationHelper = createResourceInstallationHelper(
      this.options.logger,
      this.initPromise,
      this.installAndUpdateSpaceLevelResources.bind(this)
    );
    options.productDocManager
      .then((productDocManager) => {
        this.productDocManager = productDocManager;
      })
      .catch((error) => {
        this.options.logger.warn(`Failed to initialize productDocManager: ${error.message}`);
      });
  }

  public isInitialized() {
    return this.initialized;
  }

  public getIsKBSetupInProgress() {
    return this.isKBSetupInProgress;
  }

  public setIsKBSetupInProgress(isInProgress: boolean) {
    this.isKBSetupInProgress = isInProgress;
  }

  private createDataStream: CreateDataStream = ({
    resource,
    kibanaVersion,
    fieldMap,
    settings,
    writeIndexOnly,
  }) => {
    const newDataStream = new DataStreamSpacesAdapter(this.resourceNames.aliases[resource], {
      kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
      writeIndexOnly,
    });

    newDataStream.setComponentTemplate({
      name: this.resourceNames.componentTemplate[resource],
      fieldMap,
      settings,
    });

    newDataStream.setIndexTemplate({
      name: this.resourceNames.indexTemplate[resource],
      componentTemplateRefs: [this.resourceNames.componentTemplate[resource]],
      // Apply `default_pipeline` if pipeline exists for resource
      ...(resource in this.resourceNames.pipelines &&
      // Remove this param and initialization when the `assistantKnowledgeBaseByDefault` feature flag is removed
      !(resource === 'knowledgeBase')
        ? {
            template: {
              settings: {
                'index.default_pipeline':
                  this.resourceNames.pipelines[
                    resource as keyof typeof this.resourceNames.pipelines
                  ],
              },
            },
          }
        : {}),
    });

    return newDataStream;
  };

  private async initializeResources(): Promise<InitializationPromise> {
    this.isInitializing = true;
    try {
      this.options.logger.debug(`Initializing resources for AIAssistantService`);
      const esClient = await this.options.elasticsearchClientPromise;

      if (this.productDocManager) {
        // install product documentation without blocking other resources
        void ensureProductDocumentationInstalled(this.productDocManager, this.options.logger);
      }

      // If contentReferencesEnabled is true, re-install data stream resources for new mappings if it has not been done already
      if (this.contentReferencesEnabled && !this.hasInitializedContentReferences) {
        this.options.logger.debug(`Creating conversation datastream with content references`);
        this.conversationsDataStream = this.createDataStream({
          resource: 'conversations',
          kibanaVersion: this.options.kibanaVersion,
          fieldMap: conversationsContentReferencesFieldMap,
        });
        this.hasInitializedContentReferences = true;
      }

      await this.conversationsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      if (this.assistantDefaultInferenceEndpoint) {
        const knowledgeBaseDataStreamExists = (
          await esClient.indices.getDataStream({
            name: this.knowledgeBaseDataStream.name,
          })
        )?.data_streams?.length;

        // update component template for semantic_text field
        // rollover
        let mappings: IndicesGetFieldMappingResponse = {};
        try {
          mappings = await esClient.indices.getFieldMapping({
            index: '.kibana-elastic-ai-assistant-knowledge-base-default',
            fields: ['semantic_text'],
          });
        } catch (error) {
          /* empty */
        }

        const isUsingDedicatedInferenceEndpoint =
          (
            Object.values(mappings)[0]?.mappings?.semantic_text?.mapping?.semantic_text as {
              inference_id: string;
            }
          )?.inference_id === ASSISTANT_ELSER_INFERENCE_ID;

        if (knowledgeBaseDataStreamExists && isUsingDedicatedInferenceEndpoint) {
          const currentDataStream = this.createDataStream({
            resource: 'knowledgeBase',
            kibanaVersion: this.options.kibanaVersion,
            fieldMap: {
              ...omit(knowledgeBaseFieldMap, 'semantic_text'),
              semantic_text: {
                type: 'semantic_text',
                array: false,
                required: false,
                inference_id: ASSISTANT_ELSER_INFERENCE_ID,
                search_inference_id: ELASTICSEARCH_ELSER_INFERENCE_ID,
              },
            },
          });

          // Add `search_inference_id` to the existing mappings
          await currentDataStream.install({
            esClient,
            logger: this.options.logger,
            pluginStop$: this.options.pluginStop$,
          });

          // Migrate data stream mapping to the default inference_id
          const newDS = this.createDataStream({
            resource: 'knowledgeBase',
            kibanaVersion: this.options.kibanaVersion,
            fieldMap: {
              ...omit(knowledgeBaseFieldMap, 'semantic_text'),
              semantic_text: {
                type: 'semantic_text',
                array: false,
                required: false,
              },
            },
            settings: {
              // force new semantic_text field behavior
              'index.mapping.semantic_text.use_legacy_format': false,
            },
            writeIndexOnly: true,
          });

          // We need to first install the templates and then rollover the indices
          await newDS.installTemplates({
            esClient,
            logger: this.options.logger,
            pluginStop$: this.options.pluginStop$,
          });

          const indexNames = (
            await esClient.indices.getDataStream({ name: newDS.name })
          ).data_streams.map((ds) => ds.name);

          try {
            await Promise.all(
              indexNames.map((indexName) => esClient.indices.rollover({ alias: indexName }))
            );
          } catch (e) {
            /* empty */
          }
        } else {
          // We need to make sure that the data stream is created with the correct mappings
          this.knowledgeBaseDataStream = this.createDataStream({
            resource: 'knowledgeBase',
            kibanaVersion: this.options.kibanaVersion,
            fieldMap: {
              ...omit(knowledgeBaseFieldMap, 'semantic_text'),
              semantic_text: {
                type: 'semantic_text',
                array: false,
                required: false,
              },
            },
            settings: {
              // force new semantic_text field behavior
              'index.mapping.semantic_text.use_legacy_format': false,
            },
            writeIndexOnly: true,
          });
          await this.knowledgeBaseDataStream.install({
            esClient,
            logger: this.options.logger,
            pluginStop$: this.options.pluginStop$,
          });
        }
      } else {
        // Legacy path
        await this.knowledgeBaseDataStream.install({
          esClient,
          logger: this.options.logger,
          pluginStop$: this.options.pluginStop$,
        });
      }

      await this.promptsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      await this.anonymizationFieldsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      await this.attackDiscoveryDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      await this.defendInsightsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });
    } catch (error) {
      this.options.logger.warn(`Error initializing AI assistant resources: ${error.message}`);
      this.initialized = false;
      this.isInitializing = false;
      return errorResult(error.message);
    }
    this.initialized = true;
    this.isInitializing = false;
    return successResult();
  }

  private readonly resourceNames: AssistantResourceNames = {
    componentTemplate: {
      conversations: getResourceName('component-template-conversations'),
      knowledgeBase: getResourceName('component-template-knowledge-base'),
      prompts: getResourceName('component-template-prompts'),
      anonymizationFields: getResourceName('component-template-anonymization-fields'),
      attackDiscovery: getResourceName('component-template-attack-discovery'),
      defendInsights: getResourceName('component-template-defend-insights'),
    },
    aliases: {
      conversations: getResourceName('conversations'),
      knowledgeBase: getResourceName('knowledge-base'),
      prompts: getResourceName('prompts'),
      anonymizationFields: getResourceName('anonymization-fields'),
      attackDiscovery: getResourceName('attack-discovery'),
      defendInsights: getResourceName('defend-insights'),
    },
    indexPatterns: {
      conversations: getResourceName('conversations*'),
      knowledgeBase: getResourceName('knowledge-base*'),
      prompts: getResourceName('prompts*'),
      anonymizationFields: getResourceName('anonymization-fields*'),
      attackDiscovery: getResourceName('attack-discovery*'),
      defendInsights: getResourceName('defend-insights*'),
    },
    indexTemplate: {
      conversations: getResourceName('index-template-conversations'),
      knowledgeBase: getResourceName('index-template-knowledge-base'),
      prompts: getResourceName('index-template-prompts'),
      anonymizationFields: getResourceName('index-template-anonymization-fields'),
      attackDiscovery: getResourceName('index-template-attack-discovery'),
      defendInsights: getResourceName('index-template-defend-insights'),
    },
    pipelines: {
      knowledgeBase: getResourceName('ingest-pipeline-knowledge-base'),
    },
  };

  private async checkResourcesInstallation(opts: CreateAIAssistantClientParams) {
    const licensing = await opts.licensing;
    if (!hasAIAssistantLicense(licensing.license)) return null;
    // Check if resources installation has succeeded
    const { result: initialized, error } = await this.getSpaceResourcesInitializationPromise(
      opts.spaceId
    );

    // If space level resources initialization failed, retry
    if (!initialized && error) {
      let initRetryPromise: Promise<InitializationPromise> | undefined;

      // If !this.initialized, we know that resource initialization failed
      // and we need to retry this before retrying the spaceId specific resources
      if (!this.initialized) {
        if (!this.isInitializing) {
          this.options.logger.info(`Retrying common resource initialization`);
          initRetryPromise = this.initializeResources();
        } else {
          this.options.logger.info(
            `Skipped retrying common resource initialization because it is already being retried.`
          );
        }
      }

      this.resourceInitializationHelper.retry(opts.spaceId, initRetryPromise);

      const retryResult = await this.resourceInitializationHelper.getInitializedResources(
        opts.spaceId ?? DEFAULT_NAMESPACE_STRING
      );

      if (!retryResult.result) {
        const errorLogPrefix = `There was an error in the framework installing spaceId-level resources and creating concrete indices for spaceId "${opts.spaceId}" - `;
        // Retry also failed
        this.options.logger.warn(
          retryResult.error && error
            ? `${errorLogPrefix}Retry failed with errors: ${error}`
            : `${errorLogPrefix}Original error: ${error}; Error after retry: ${retryResult.error}`
        );
        return null;
      } else {
        this.options.logger.info(
          `Resource installation for "${opts.spaceId}" succeeded after retry`
        );
      }
    }
  }

  public async createAIAssistantConversationsDataClient(
    opts: CreateAIAssistantClientParams & GetAIAssistantConversationsDataClientParams
  ): Promise<AIAssistantConversationsDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    // Note: Due to plugin lifecycle and feature flag registration timing, we need to pass in the feature flag here
    // Remove this param and initialization when the `contentReferencesEnabled` feature flag is removed
    if (opts.contentReferencesEnabled) {
      this.contentReferencesEnabled = true;
    }

    // If contentReferences are enable but the conversation field mappings with content references have not been initialized,
    // then call initializeResources which will create the datastreams with content references field mappings. After they have
    // been created, hasInitializedContentReferences will ensure they dont get created again.
    if (this.contentReferencesEnabled && !this.hasInitializedContentReferences) {
      await this.initializeResources();
    }

    return new AIAssistantConversationsDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.conversations,
      currentUser: opts.currentUser,
    });
  }

  public async createAIAssistantKnowledgeBaseDataClient(
    opts: CreateAIAssistantClientParams & GetAIAssistantKnowledgeBaseDataClientParams
  ): Promise<AIAssistantKnowledgeBaseDataClient | null> {
    // If modelIdOverride is set, swap getElserId(), and ensure the pipeline is re-created with the correct model
    if (opts?.modelIdOverride != null) {
      const modelIdOverride = opts.modelIdOverride;
      this.getElserId = async () => modelIdOverride;
    }

    // If a V2 KnowledgeBase has never been initialized or a modelIdOverride is provided, we need to reinitialize all persistence resources to make sure
    // they're using the correct model/mappings. Technically all existing KB data is stale since it was created
    // with a different model/mappings, but modelIdOverride is only intended for testing purposes at this time
    // Added hasInitializedV2KnowledgeBase to prevent the console noise from re-init on each KB request
    if (!this.hasInitializedV2KnowledgeBase || opts?.modelIdOverride != null) {
      await this.initializeResources();
      this.hasInitializedV2KnowledgeBase = true;
    }

    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantKnowledgeBaseDataClient({
      logger: this.options.logger.get('knowledgeBase'),
      currentUser: opts.currentUser,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      indexPatternsResourceName: this.resourceNames.aliases.knowledgeBase,
      ingestPipelineResourceName: this.resourceNames.pipelines.knowledgeBase,
      getElserId: this.getElserId,
      getIsKBSetupInProgress: this.getIsKBSetupInProgress.bind(this),
      kibanaVersion: this.options.kibanaVersion,
      ml: this.options.ml,
      setIsKBSetupInProgress: this.setIsKBSetupInProgress.bind(this),
      spaceId: opts.spaceId,
      manageGlobalKnowledgeBaseAIAssistant: opts.manageGlobalKnowledgeBaseAIAssistant ?? false,
      assistantDefaultInferenceEndpoint: this.assistantDefaultInferenceEndpoint,
    });
  }

  public async createAttackDiscoveryDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AttackDiscoveryDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AttackDiscoveryDataClient({
      logger: this.options.logger.get('attackDiscovery'),
      currentUser: opts.currentUser,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      indexPatternsResourceName: this.resourceNames.aliases.attackDiscovery,
      kibanaVersion: this.options.kibanaVersion,
      spaceId: opts.spaceId,
    });
  }

  public async createDefendInsightsDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<DefendInsightsDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new DefendInsightsDataClient({
      logger: this.options.logger.get('defendInsights'),
      currentUser: opts.currentUser,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      indexPatternsResourceName: this.resourceNames.aliases.defendInsights,
      kibanaVersion: this.options.kibanaVersion,
      spaceId: opts.spaceId,
    });
  }

  public async createAIAssistantPromptsDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AIAssistantDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.prompts,
      currentUser: opts.currentUser,
    });
  }

  public async createAIAssistantAnonymizationFieldsDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AIAssistantDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.anonymizationFields,
      currentUser: opts.currentUser,
    });
  }

  public async getSpaceResourcesInitializationPromise(
    spaceId: string | undefined = DEFAULT_NAMESPACE_STRING
  ): Promise<InitializationPromise> {
    const result = await this.resourceInitializationHelper.getInitializedResources(spaceId);
    // If the spaceId is unrecognized and spaceId is not the default, we
    // need to kick off resource installation and return the promise
    if (
      result.error &&
      result.error.includes(`Unrecognized spaceId`) &&
      spaceId !== DEFAULT_NAMESPACE_STRING
    ) {
      this.resourceInitializationHelper.add(spaceId);
      return this.resourceInitializationHelper.getInitializedResources(spaceId);
    }
    return result;
  }

  private async installAndUpdateSpaceLevelResources(
    spaceId: string | undefined = DEFAULT_NAMESPACE_STRING
  ) {
    try {
      this.options.logger.debug(`Initializing spaceId level resources for AIAssistantService`);
      const conversationsIndexName = await this.conversationsDataStream.getInstalledSpaceName(
        spaceId
      );
      if (!conversationsIndexName) {
        await this.conversationsDataStream.installSpace(spaceId);
      }

      const knowledgeBaseIndexName = await this.knowledgeBaseDataStream.getInstalledSpaceName(
        spaceId
      );
      if (!knowledgeBaseIndexName) {
        await this.knowledgeBaseDataStream.installSpace(spaceId);
      }

      const promptsIndexName = await this.promptsDataStream.getInstalledSpaceName(spaceId);
      if (!promptsIndexName) {
        await this.promptsDataStream.installSpace(spaceId);
      }

      const anonymizationFieldsIndexName =
        await this.anonymizationFieldsDataStream.getInstalledSpaceName(spaceId);

      if (!anonymizationFieldsIndexName) {
        await this.anonymizationFieldsDataStream.installSpace(spaceId);
        await this.createDefaultAnonymizationFields(spaceId);
      }
    } catch (error) {
      this.options.logger.warn(
        `Error initializing AI assistant namespace level resources: ${error.message}`
      );
      throw error;
    }
  }

  private async createDefaultAnonymizationFields(spaceId: string) {
    const dataClient = new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.anonymizationFields,
      currentUser: null,
    });

    const existingAnonymizationFields = await (
      await dataClient?.getReader()
    ).search({
      body: {
        size: 1,
      },
      allow_no_indices: true,
    });
    if (existingAnonymizationFields.hits.total.value === 0) {
      const writer = await dataClient?.getWriter();
      const res = await writer?.bulk({
        documentsToCreate: getDefaultAnonymizationFields(spaceId),
      });
      this.options.logger.info(`Created default anonymization fields: ${res?.docs_created.length}`);
    }
  }
}
