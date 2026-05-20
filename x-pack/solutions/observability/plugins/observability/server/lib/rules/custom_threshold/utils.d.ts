import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, IBasePath } from '@kbn/core/server';
import type { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { ObservabilityConfig } from '../../..';
import type { AlertExecutionDetails } from './types';
export declare const CONTAINER_ID = "container.id";
export declare const oneOfLiterals: (arrayOfLiterals: Readonly<string[]>) => import("@kbn/config-schema").Type<string>;
export declare const createScopedLogger: (logger: Logger, scope: string, alertExecutionDetails: AlertExecutionDetails) => Logger;
export declare const getAlertDetailsPageEnabledForApp: (config: ObservabilityConfig["unsafe"]["alertDetails"] | null, appName: keyof ObservabilityConfig["unsafe"]["alertDetails"]) => boolean;
export declare const getAlertDetailsUrl: (basePath: IBasePath, spaceId: string, alertUuid: string | null) => string;
export declare const KUBERNETES_POD_UID = "kubernetes.pod.uid";
export declare const NUMBER_OF_DOCUMENTS = 10;
export interface AdditionalContext {
    [x: string]: any;
}
export declare const doFieldsExist: (esClient: ElasticsearchClient, fields: string[], index: string) => Promise<Record<string, boolean>>;
export declare const validGroupByForContext: string[];
export declare const hasAdditionalContext: (groupBy: string | string[] | undefined, validGroups: string[]) => boolean;
export declare const shouldTermsAggOnContainer: (groupBy: string | string[] | undefined) => boolean;
export declare const flattenAdditionalContext: (additionalContext: AdditionalContext | undefined | null) => AdditionalContext;
export declare const getContextForRecoveredAlerts: <T extends Alert | (ParsedTechnicalFields & ParsedExperimentalFields)>(alertHitSource: Partial<T> | undefined | null) => AdditionalContext;
export declare const INFRA_ALERT_PREVIEW_PATH = "/api/infra/alerting/preview";
export declare const TOO_MANY_BUCKETS_PREVIEW_EXCEPTION = "TOO_MANY_BUCKETS_PREVIEW_EXCEPTION";
export interface TooManyBucketsPreviewExceptionMetadata {
    TOO_MANY_BUCKETS_PREVIEW_EXCEPTION: boolean;
    maxBuckets: any;
}
export declare const isTooManyBucketsPreviewException: (value: any) => value is TooManyBucketsPreviewExceptionMetadata;
export declare const calculateRateTimeranges: (timerange: {
    to: number;
    from: number;
}) => {
    firstBucketRange: {
        from: number;
        to: number;
    };
    secondBucketRange: {
        from: number;
        to: number;
    };
    intervalInSeconds: number;
};
