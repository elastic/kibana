import type { KibanaRequest, Logger } from '@kbn/core/server';
import type Ml from '@elastic/elasticsearch/lib/api/api/ml';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare function getToolHandler({ core, plugins, mlClient, request, logger, group, jobIds, jobsLimit, anomalyRecordsLimit, minAnomalyScore, includeExplanation, influencerFilter, rangeStart, rangeEnd, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    mlClient: Ml;
    request: KibanaRequest;
    logger: Logger;
    group?: string;
    jobIds?: string[];
    jobsLimit: number;
    anomalyRecordsLimit: number;
    minAnomalyScore: number;
    includeExplanation: boolean;
    influencerFilter?: string;
    rangeStart: string;
    rangeEnd: string;
}): Promise<{
    jobId: string;
    description: string | undefined;
    bucketSpan: import("@elastic/elasticsearch/lib/api/types").Duration | undefined;
    datafeedIndices: string[] | undefined;
    detectors: {
        description: string | undefined;
        function: string | undefined;
        fieldName: string | undefined;
    }[];
    topAnomalies: {
        anomalyScoreExplanation?: {
            anomaly_type?: "dip" | "spike";
            anomaly_length?: number;
            single_bucket_impact?: number;
            multi_bucket_impact?: number;
            anomaly_characteristics_impact?: number;
            lower_confidence_bound?: number;
            typical_value?: number;
            upper_confidence_bound?: number;
            high_variance_penalty?: boolean;
            incomplete_bucket_penalty?: boolean;
            multimodal_distribution?: boolean;
        } | undefined;
        timestamp: number;
        anomalyScore: number;
        byFieldName: string | undefined;
        byFieldValue: string | undefined;
        partitionFieldName: string | undefined;
        partitionFieldValue: string | number | undefined;
        fieldName: string | undefined;
        typicalValue: number[] | undefined;
        actualValue: number[] | undefined;
        influencers: {
            fieldName: string;
            fieldValues: string[];
        }[] | undefined;
    }[];
    jobStats: {
        state: import("@elastic/elasticsearch/lib/api/types").MlJobState | undefined;
        lastRecordTimestamp: number | undefined;
        processedRecordCount: number | undefined;
    };
}[]>;
