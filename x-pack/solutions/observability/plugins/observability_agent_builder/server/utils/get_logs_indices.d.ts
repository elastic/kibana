import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
export declare function getLogsIndices({ core, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
}): Promise<string[]>;
