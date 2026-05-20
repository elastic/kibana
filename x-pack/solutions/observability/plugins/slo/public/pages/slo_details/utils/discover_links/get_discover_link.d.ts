import type { IUiSettingsClient } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare function createDiscoverLocator({ slo, showBad, showGood, timeRange, uiSettings, }: {
    slo: SLOWithSummaryResponse;
    showBad: boolean;
    showGood: boolean;
    timeRange: TimeRange;
    uiSettings?: IUiSettingsClient;
}): {
    timeRange: TimeRange;
    query: {
        query: string;
        language: string;
    };
    filters: Filter[];
    dataViewSpec: {
        id: string;
        title: string;
        timeFieldName: string;
    };
};
export declare function getDiscoverLink({ slo, timeRange, discover, uiSettings, }: {
    slo: SLOWithSummaryResponse;
    timeRange: TimeRange;
    discover?: DiscoverStart;
    uiSettings?: IUiSettingsClient;
}): string | undefined;
export declare function openInDiscover({ slo, showBad, showGood, timeRange, discover, uiSettings, }: {
    slo: SLOWithSummaryResponse;
    showBad: boolean;
    showGood: boolean;
    timeRange: TimeRange;
    discover?: DiscoverStart;
    uiSettings?: IUiSettingsClient;
}): void;
export interface ApmTracesDiscoverParams {
    index: string;
    serviceName: string;
    environment: string;
    transactionType: string;
    transactionName: string;
}
export declare function getApmTracesDiscoverUrl({ params, share, timeRange, }: {
    params: ApmTracesDiscoverParams;
    share: SharePluginStart;
    timeRange: {
        from: string;
        to: string;
    };
}): string | undefined;
