export declare const INVALID_EQUATION_REGEX: RegExp;
export declare const ALERT_ACTION_ID = "slo.burnRate.alert";
export declare const ALERT_ACTION: {
    id: string;
    name: string;
    severity: {
        level: number;
    };
};
export declare const HIGH_PRIORITY_ACTION_ID = "slo.burnRate.high";
export declare const HIGH_PRIORITY_ACTION: {
    id: string;
    name: string;
    severity: {
        level: number;
    };
};
export declare const MEDIUM_PRIORITY_ACTION_ID = "slo.burnRate.medium";
export declare const MEDIUM_PRIORITY_ACTION: {
    id: string;
    name: string;
    severity: {
        level: number;
    };
};
export declare const LOW_PRIORITY_ACTION_ID = "slo.burnRate.low";
export declare const LOW_PRIORITY_ACTION: {
    id: string;
    name: string;
    severity: {
        level: number;
    };
};
export declare const SUPPRESSED_PRIORITY_ACTION_ID = "slo.burnRate.suppressed";
export declare const SUPPRESSED_PRIORITY_ACTION: {
    id: string;
    name: string;
};
export declare const LOCK_ID_RESOURCE_INSTALLER = "slo:resource_installer";
export declare const SLO_MODEL_VERSION = 2;
export declare const SLO_RESOURCES_VERSION = 3.6;
export declare const SLO_RESOURCES_VERSION_MAJOR = 3;
export declare const SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME = ".slo-observability.sli-mappings-v3.6";
export declare const SLI_COMPONENT_TEMPLATE_SETTINGS_NAME = ".slo-observability.sli-settings-v3.6";
export declare const SLI_INDEX_TEMPLATE_NAME = ".slo-observability.sli-v3.6";
export declare const SLI_INDEX_TEMPLATE_PATTERN = ".slo-observability.sli-v3.6*";
export declare const SLI_DESTINATION_INDEX_NAME = ".slo-observability.sli-v3.6";
export declare const SLI_DESTINATION_INDEX_PATTERN = ".slo-observability.sli-v3*";
export declare const SLI_INGEST_PIPELINE_INDEX_NAME_PREFIX = ".slo-observability.sli-v3.6.";
export declare const SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME = ".slo-observability.summary-mappings-v3.6";
export declare const SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME = ".slo-observability.summary-settings-v3.6";
export declare const SUMMARY_INDEX_TEMPLATE_NAME = ".slo-observability.summary-v3.6";
export declare const SUMMARY_INDEX_TEMPLATE_PATTERN = ".slo-observability.summary-v3.6*";
export declare const SUMMARY_DESTINATION_INDEX_NAME = ".slo-observability.summary-v3.6";
export declare const SUMMARY_TEMP_INDEX_NAME = ".slo-observability.summary-v3.6.temp";
export declare const SUMMARY_DESTINATION_INDEX_PATTERN = ".slo-observability.summary-v3*";
export declare const HEALTH_DATA_STREAM_NAME = ".slo-observability.health-v3.6";
export declare const HEALTH_INDEX_TEMPLATE_NAME = ".slo-observability.health-v3.6@template";
export declare const getSLOTransformId: (sloId: string, sloRevision: number) => string;
export declare const getSLOSummaryTransformId: (sloId: string, sloRevision: number) => string;
export declare const getWildcardTransformId: (sloId: string, sloRevision: number) => string;
export declare const getSLOPipelineId: (sloId: string, sloRevision: number) => string;
export declare const getSLOSummaryPipelineId: (sloId: string, sloRevision: number) => string;
export declare const getCustomSLOPipelineId: (sloId: string) => string;
export declare const getCustomSLOSummaryPipelineId: (sloId: string) => string;
export declare const getCustomSLOWildcardPipelineId: (sloId: string) => string;
export declare const getWildcardPipelineId: (sloId: string, sloRevision: number) => string;
export declare const SYNTHETICS_INDEX_PATTERN = "synthetics-*";
export declare const SYNTHETICS_DEFAULT_GROUPINGS: string[];
export declare const DEFAULT_STALE_SLO_THRESHOLD_HOURS = 48;
export declare const DEFAULT_SLO_PAGE_SIZE = 25;
export declare const DEFAULT_SLO_GROUPS_PAGE_SIZE = 25;
export declare const COMPOSITE_SLO_RESOURCES_VERSION = 1;
export declare const COMPOSITE_SLO_RESOURCES_VERSION_MAJOR = 1;
export declare const COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME = ".slo-observability.composite-summary-mappings-v1";
export declare const COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME = ".slo-observability.composite-summary-v1";
export declare const COMPOSITE_SUMMARY_INDEX_TEMPLATE_PATTERN = ".slo-observability.composite-summary-v1*";
export declare const COMPOSITE_SUMMARY_INDEX_NAME = ".slo-observability.composite-summary-v1";
