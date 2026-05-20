import type { HttpSetup } from '@kbn/core/public';
import type { GetRelatedDashboardsResponse } from '@kbn/observability-schema';
export declare const fetchRelatedDashboards: ({ alertId, http, }: {
    alertId: string;
    http: HttpSetup;
}) => Promise<GetRelatedDashboardsResponse>;
export declare const getRelatedDashboardsQueryKey: (alertId: string) => string[];
export declare const useRelatedDashboards: (alertId: string) => {
    isLoadingRelatedDashboards: boolean;
    suggestedDashboards: {
        matchedBy: {
            fields?: string[] | undefined;
            index?: string[] | undefined;
        };
        score: number;
        id: string;
        title: string;
        description?: string | undefined;
        tags?: string[] | undefined;
    }[] | undefined;
    linkedDashboards: {
        matchedBy: {
            fields?: string[] | undefined;
            index?: string[] | undefined;
            linked?: boolean | undefined;
        };
        id: string;
        title: string;
        description?: string | undefined;
        tags?: string[] | undefined;
    }[] | undefined;
    refetchRelatedDashboards: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<{
        suggestedDashboards: {
            matchedBy: {
                fields?: string[] | undefined;
                index?: string[] | undefined;
            };
            score: number;
            id: string;
            title: string;
            description?: string | undefined;
            tags?: string[] | undefined;
        }[];
        linkedDashboards: {
            matchedBy: {
                fields?: string[] | undefined;
                index?: string[] | undefined;
                linked?: boolean | undefined;
            };
            id: string;
            title: string;
            description?: string | undefined;
            tags?: string[] | undefined;
        }[];
    }, unknown>>;
};
