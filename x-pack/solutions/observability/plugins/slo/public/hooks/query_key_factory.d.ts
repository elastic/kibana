import type { Indicator, Objective } from '@kbn/slo-schema';
interface SloListFilter {
    kqlQuery: string;
    page: number;
    perPage: number;
    sortBy: string;
    sortDirection: string;
    filters: string;
    lastRefresh?: number;
}
interface SloGroupListFilter {
    page: number;
    perPage: number;
    groupBy: string;
    kqlQuery: string;
    filters: string;
    lastRefresh?: number;
    groupsFilter?: string[];
}
interface SLOOverviewFilter {
    kqlQuery: string;
    filters: string;
    lastRefresh?: number;
}
interface SloTemplateListFilter {
    search?: string;
    tags?: string[];
    page: number;
    perPage: number;
}
export declare const sloKeys: {
    all: readonly ["slo"];
    lists: () => readonly ["slo", "list"];
    list: (filters: SloListFilter) => readonly ["slo", "list", SloListFilter];
    group: (filters: SloGroupListFilter) => readonly ["slo", "group", SloGroupListFilter];
    groups: () => readonly ["slo", "group"];
    overview: (filters: SLOOverviewFilter) => readonly ["overview", SLOOverviewFilter];
    templates: () => readonly ["slo", "templates"];
    template: (templateId: string) => readonly ["slo", "templates", string];
    templatesList: (filters: SloTemplateListFilter) => readonly ["slo", "templates", "list", SloTemplateListFilter];
    templateTags: () => readonly ["slo", "templates", "tags"];
    details: () => readonly ["slo", "details"];
    detail: (sloId: string, instanceId: string | undefined, remoteName: string | undefined) => readonly ["slo", "details", {
        readonly sloId: string;
        readonly instanceId: string | undefined;
        readonly remoteName: string | undefined;
    }];
    rules: () => readonly ["slo", "rules"];
    rule: (sloIds: string[]) => readonly ["slo", "rules", string[]];
    activeAlerts: () => readonly ["slo", "activeAlerts"];
    activeAlert: (sloIdsAndInstanceIds: Array<[string, string]>) => readonly ["slo", "activeAlerts", ...string[]];
    historicalSummaries: () => readonly ["slo", "historicalSummary"];
    historicalSummary: (list: Array<{
        sloId: string;
        instanceId: string;
    }>) => readonly ["slo", "historicalSummary", {
        sloId: string;
        instanceId: string;
    }[]];
    allDefinitions: () => string[];
    definitions: (params: {
        search: string;
        page: number;
        perPage: number;
        includeOutdatedOnly: boolean;
        validTags: string;
    }) => (string | {
        search: string;
        page: number;
        perPage: number;
        includeOutdatedOnly: boolean;
        validTags: string;
    })[];
    searchDefinitions: (params: {
        search: string;
        size: number;
        searchAfter?: string;
        remoteName?: string;
    }) => readonly ["slo", "searchDefinitions", {
        search: string;
        size: number;
        searchAfter?: string;
        remoteName?: string;
    }];
    globalDiagnosis: () => readonly ["slo", "globalDiagnosis"];
    allHealth: () => readonly ["slo", "health"];
    health: (list: Array<{
        id: string;
        instanceId: string;
    }>) => readonly ["slo", "health", {
        id: string;
        instanceId: string;
    }[]];
    burnRates: (sloId: string, instanceId: string | undefined, windows: Array<{
        name: string;
        duration: string;
    }>) => readonly ["slo", "burnRates", string, string | undefined, {
        name: string;
        duration: string;
    }[]];
    preview: (params: {
        remoteName?: string;
        groupings?: Record<string, string | number>;
        objective?: Objective;
        indicator: Indicator;
        range: {
            from: Date;
            to: Date;
        };
        groupBy?: string[];
    }) => readonly ["slo", "preview", {
        remoteName?: string;
        groupings?: Record<string, string | number>;
        objective?: Objective;
        indicator: Indicator;
        range: {
            from: Date;
            to: Date;
        };
        groupBy?: string[];
    }];
    burnRateRules: (search: string) => string[];
    instances: (params: {
        sloId: string;
        search?: string;
        searchAfter?: string;
        size: number;
        remoteName?: string;
    }) => readonly ["slo", "instances", {
        sloId: string;
        search?: string;
        searchAfter?: string;
        size: number;
        remoteName?: string;
    }];
    bulkDeleteStatus: (taskId: string) => readonly ["slo", "bulkDeleteStatus", string];
    allHealthScans: () => readonly ["slo", "healthScans"];
    healthScans: (size?: number) => readonly ["slo", "healthScans", {
        readonly size: number | undefined;
    }];
    allHealthScanResults: () => readonly ["slo", "healthScanResults"];
    healthScanResults: ({ scanId, size, searchAfter, problematic, allSpaces, }: {
        scanId: string;
        size?: number;
        searchAfter?: string;
        problematic?: boolean;
        allSpaces?: boolean;
    }) => readonly ["slo", "healthScanResults", {
        readonly scanId: string;
        readonly size: number | undefined;
        readonly searchAfter: string | undefined;
        readonly problematic: boolean | undefined;
        readonly allSpaces: boolean | undefined;
    }];
    compositeLists: () => readonly ["slo", "compositeList"];
    compositeList: (filters: {
        page: number;
        perPage: number;
        search?: string;
        tags?: string;
        sortBy?: string;
        sortDirection?: string;
        status?: string;
    }) => readonly ["slo", "compositeList", {
        page: number;
        perPage: number;
        search?: string;
        tags?: string;
        sortBy?: string;
        sortDirection?: string;
        status?: string;
    }];
    compositeDetails: () => readonly ["slo", "compositeDetail"];
    compositeDetail: (id: string) => readonly ["slo", "compositeDetail", string];
    compositeHistoricalSummaries: () => readonly ["slo", "compositeHistoricalSummary"];
    compositeHistoricalSummary: (ids: string[]) => readonly ["slo", "compositeHistoricalSummary", string[]];
    compositeSuggestions: () => readonly ["slo", "compositeSuggestions"];
};
export type SloKeys = typeof sloKeys;
export {};
