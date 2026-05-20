import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
/**
 * Availability handler for Observability Agent Builder resources.
 * Gates availability to Observability or Classic solution spaces.
 * If spaces are unavailable, returns available.
 */
export declare function getAgentBuilderResourceAvailability({ core, request, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    request: KibanaRequest;
    logger: Logger;
}): Promise<ToolAvailabilityResult>;
