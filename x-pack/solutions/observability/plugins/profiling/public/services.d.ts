import type { TopNFunctions } from '@kbn/profiling-utils';
import { type ElasticFlameGraph } from '@kbn/profiling-utils';
import type { IndexLifecyclePhaseSelectOption, IndicesStorageDetailsAPIResponse, StorageExplorerSummaryAPIResponse, StorageHostDetailsAPIResponse } from '../common/storage_explorer';
import type { TopNResponse } from '../common/topn';
import type { SetupDataCollectionInstructions } from '../server/routes/setup/get_cloud_setup_instructions';
import type { AutoAbortedHttpService } from './hooks/use_auto_aborted_http_client';
export interface APMTransactionsPerService {
    [serviceName: string]: {
        serviceName: string;
        transactions: Array<{
            name: string | null;
            samples: number | null;
        }>;
    };
}
export interface ProfilingSetupStatus {
    type: 'cloud' | 'self-managed' | 'serverless';
    profiling_enabled?: boolean;
    has_setup: boolean;
    has_data: boolean;
    pre_8_9_1_data: boolean;
    has_required_role: boolean;
    unauthorized?: boolean;
}
export interface Services {
    fetchTopN: (params: {
        http: AutoAbortedHttpService;
        type: string;
        timeFrom: number;
        timeTo: number;
        kuery: string;
    }) => Promise<TopNResponse>;
    fetchTopNFunctions: (params: {
        http: AutoAbortedHttpService;
        timeFrom: number;
        timeTo: number;
        startIndex: number;
        endIndex: number;
        kuery: string;
    }) => Promise<TopNFunctions>;
    fetchElasticFlamechart: (params: {
        http: AutoAbortedHttpService;
        timeFrom: number;
        timeTo: number;
        kuery: string;
        showErrorFrames: boolean;
    }) => Promise<ElasticFlameGraph>;
    fetchHasSetup: (params: {
        http: AutoAbortedHttpService;
    }) => Promise<ProfilingSetupStatus>;
    postSetupResources: (params: {
        http: AutoAbortedHttpService;
    }) => Promise<void>;
    setupDataCollectionInstructions: (params: {
        http: AutoAbortedHttpService;
    }) => Promise<SetupDataCollectionInstructions>;
    fetchStorageExplorerSummary: (params: {
        http: AutoAbortedHttpService;
        timeFrom: number;
        timeTo: number;
        kuery: string;
        indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    }) => Promise<StorageExplorerSummaryAPIResponse>;
    fetchStorageExplorerHostStorageDetails: (params: {
        http: AutoAbortedHttpService;
        timeFrom: number;
        timeTo: number;
        kuery: string;
        indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    }) => Promise<StorageHostDetailsAPIResponse>;
    fetchStorageExplorerIndicesStorageDetails: (params: {
        http: AutoAbortedHttpService;
        indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    }) => Promise<IndicesStorageDetailsAPIResponse>;
    fetchTopNFunctionAPMTransactions: (params: {
        http: AutoAbortedHttpService;
        timeFrom: number;
        timeTo: number;
        functionName: string;
        serviceNames: string[];
    }) => Promise<APMTransactionsPerService>;
}
export declare function getServices(): Services;
