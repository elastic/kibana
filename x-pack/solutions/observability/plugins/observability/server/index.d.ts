import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ObservabilityPluginSetup } from './plugin';
import type { Mappings } from './utils/create_or_update_index';
import { createOrUpdateIndex } from './utils/create_or_update_index';
import { createOrUpdateIndexTemplate } from './utils/create_or_update_index_template';
import type { ScopedAnnotationsClient } from './lib/annotations/bootstrap_annotations';
import type { CustomThresholdLocators } from './lib/rules/custom_threshold/custom_threshold_executor';
import { unwrapEsResponse, WrappedElasticsearchClientError } from '../common/utils/unwrap_es_response';
export { rangeQuery, kqlQuery, termQuery, termsQuery, wildcardQuery, existsQuery, } from './utils/queries';
export { getParsedFilterQuery } from './utils/get_parsed_filtered_query';
export { getInspectResponse } from '../common/utils/get_inspect_response';
export type { ObservabilityRouteCreateOptions, ObservabilityRouteHandlerResources, AbstractObservabilityServerRouteRepository, ObservabilityServerRouteRepository, APIEndpoint, ObservabilityAPIReturnType, ObservabilityRequestHandlerContext, ObservabilityPluginRouter, } from './types';
export { metricsExplorerViewSavedObjectAttributesRT, metricsExplorerViewSavedObjectRT, } from './types';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    annotations: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        index: import("@kbn/config-schema").Type<string>;
    }>;
    unsafe: import("@kbn/config-schema").ObjectType<{
        alertDetails: import("@kbn/config-schema").ObjectType<{
            metrics: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
            logs: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
            uptime: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
            observability: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
        }>;
        thresholdRule: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        }>;
        ruleFormV2: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
        }>;
    }>;
    customThresholdRule: import("@kbn/config-schema").ObjectType<{
        groupByPageSize: import("@kbn/config-schema").Type<number>;
    }>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    createO11yGenericFeatureId: import("@kbn/config-schema").Type<boolean>;
    managedOtlpServiceUrl: import("@kbn/config-schema").Type<string>;
}>;
export declare const config: PluginConfigDescriptor;
export type ObservabilityConfig = TypeOf<typeof configSchema>;
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").ObservabilityPlugin>;
export type { Mappings, ObservabilityPluginSetup, ScopedAnnotationsClient, CustomThresholdLocators, };
export { createOrUpdateIndex, createOrUpdateIndexTemplate, unwrapEsResponse, WrappedElasticsearchClientError, };
export { uiSettings } from './ui_settings';
