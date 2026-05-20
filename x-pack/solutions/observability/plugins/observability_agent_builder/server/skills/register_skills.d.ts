import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
export declare const registerSkills: ({ plugins, logger, }: {
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}) => void;
