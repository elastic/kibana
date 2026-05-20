import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../../types';
export interface SignalFetcherDeps {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    logger: Logger;
    serviceName: string;
    serviceEnvironment: string;
    transactionType?: string;
    transactionName?: string;
    hostName: string;
}
export interface SignalFetcher {
    key: string;
    description: string;
    startOffsetMinutes: number;
    fetch: (deps: SignalFetcherDeps, start: string, end: string) => Promise<unknown>;
}
export interface SignalResult {
    key: string;
    description: string;
    start: string;
    end: string;
    data: unknown;
}
export declare const SIGNAL_FETCHERS: SignalFetcher[];
export declare function runSignalFetchers(deps: SignalFetcherDeps, alertStart: string): Promise<SignalResult[]>;
export declare function formatSignalResults(results: SignalResult[]): {
    context: string;
    signalDescriptions: string[];
};
