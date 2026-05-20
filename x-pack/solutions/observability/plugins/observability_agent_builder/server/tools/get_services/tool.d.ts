import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
export declare const OBSERVABILITY_GET_SERVICES_TOOL_ID = "observability.get_services";
declare const getServicesSchema: z.ZodObject<{
    anomalySeverities: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        critical: ML_ANOMALY_SEVERITY.CRITICAL;
        major: ML_ANOMALY_SEVERITY.MAJOR;
        minor: ML_ANOMALY_SEVERITY.MINOR;
        warning: ML_ANOMALY_SEVERITY.WARNING;
        low: ML_ANOMALY_SEVERITY.LOW;
        unknown: ML_ANOMALY_SEVERITY.UNKNOWN;
    }>>>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetServicesTool({ core, plugins, dataRegistry, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    logger: Logger;
}): StaticToolRegistration<typeof getServicesSchema>;
export {};
