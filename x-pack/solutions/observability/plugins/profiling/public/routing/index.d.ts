import { StackTracesDisplayOption, TopNComparisonFunctionSortField, TopNFunctionSortField, TopNType } from '@kbn/profiling-utils';
import * as t from 'io-ts';
import React from 'react';
import { IndexLifecyclePhaseSelectOption } from '../../common/storage_explorer';
import { ComparisonMode, NormalizationMode } from '../components/normalization_menu';
import { AddDataTabs } from '../views/add_data_view';
declare const routes: {
    '/': {
        element: React.JSX.Element;
        children: {
            '/settings': {
                element: React.JSX.Element;
            };
            '/add-data-instructions': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.TypeC<{
                        selectedTab: t.UnionC<[t.LiteralC<AddDataTabs.Binary>, t.LiteralC<AddDataTabs.Deb>, t.LiteralC<AddDataTabs.Docker>, t.LiteralC<AddDataTabs.ElasticAgentIntegration>, t.LiteralC<AddDataTabs.Kubernetes>, t.LiteralC<AddDataTabs.RPM>, t.LiteralC<AddDataTabs.Symbols>]>;
                    }>;
                }>;
                defaults: {
                    query: {
                        selectedTab: AddDataTabs;
                    };
                };
            };
            '/delete_data_instructions': {
                element: React.JSX.Element;
            };
            '/profiling-not-enabled': {
                element: React.JSX.Element;
            };
            '/': {
                children: {
                    '/stacktraces/{topNType}': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            path: t.TypeC<{
                                topNType: t.UnionC<[t.LiteralC<TopNType.Containers>, t.LiteralC<TopNType.Deployments>, t.LiteralC<TopNType.Executables>, t.LiteralC<TopNType.Hosts>, t.LiteralC<TopNType.Threads>, t.LiteralC<TopNType.Traces>]>;
                            }>;
                            query: t.TypeC<{
                                displayAs: t.UnionC<[t.LiteralC<StackTracesDisplayOption.StackTraces>, t.LiteralC<StackTracesDisplayOption.Percentage>]>;
                                limit: t.Type<number, number, unknown>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                displayAs: StackTracesDisplayOption;
                                limit: string;
                            };
                        };
                    };
                    '/stacktraces': {
                        element: React.JSX.Element;
                    };
                    '/flamegraphs': {
                        element: React.JSX.Element;
                        children: {
                            '/flamegraphs/flamegraph': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.PartialC<{
                                        searchText: t.StringC;
                                    }>;
                                }>;
                            };
                            '/flamegraphs/differential': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        comparisonRangeFrom: t.StringC;
                                        comparisonRangeTo: t.StringC;
                                        comparisonKuery: t.StringC;
                                        comparisonMode: t.UnionC<[t.LiteralC<ComparisonMode.Absolute>, t.LiteralC<ComparisonMode.Relative>]>;
                                        normalizationMode: t.UnionC<[t.LiteralC<NormalizationMode.Scale>, t.LiteralC<NormalizationMode.Time>]>;
                                    }>, t.PartialC<{
                                        baseline: t.Type<number, number, unknown>;
                                        comparison: t.Type<number, number, unknown>;
                                        searchText: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        comparisonRangeFrom: string;
                                        comparisonRangeTo: string;
                                        comparisonKuery: string;
                                        comparisonMode: ComparisonMode;
                                        normalizationMode: NormalizationMode;
                                    };
                                };
                            };
                        };
                    };
                    '/functions': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                sortField: t.UnionC<[t.LiteralC<TopNFunctionSortField.Rank>, t.LiteralC<TopNFunctionSortField.Frame>, t.LiteralC<TopNFunctionSortField.Samples>, t.LiteralC<TopNFunctionSortField.SelfCPU>, t.LiteralC<TopNFunctionSortField.TotalCPU>, t.LiteralC<TopNFunctionSortField.Diff>, t.LiteralC<TopNFunctionSortField.AnnualizedCo2>, t.LiteralC<TopNFunctionSortField.AnnualizedDollarCost>]>;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                sortField: TopNFunctionSortField;
                                sortDirection: string;
                            };
                        };
                        children: {
                            '/functions/topn': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.PartialC<{
                                        pageIndex: t.Type<number, number, unknown>;
                                        searchFunctionName: t.StringC;
                                    }>;
                                }>;
                            };
                            '/functions/differential': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        comparisonRangeFrom: t.StringC;
                                        comparisonRangeTo: t.StringC;
                                        comparisonKuery: t.StringC;
                                        normalizationMode: t.UnionC<[t.LiteralC<NormalizationMode.Scale>, t.LiteralC<NormalizationMode.Time>]>;
                                        comparisonSortField: t.UnionC<[t.LiteralC<TopNComparisonFunctionSortField.ComparisonRank>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonFrame>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonSamples>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonSelfCPU>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonTotalCPU>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonDiff>]>;
                                        comparisonSortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                    }>, t.PartialC<{
                                        baseline: t.Type<number, number, unknown>;
                                        comparison: t.Type<number, number, unknown>;
                                        pageIndex: t.Type<number, number, unknown>;
                                        searchFunctionName: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        comparisonRangeFrom: string;
                                        comparisonRangeTo: string;
                                        comparisonKuery: string;
                                        normalizationMode: NormalizationMode;
                                        comparisonSortField: TopNComparisonFunctionSortField;
                                        comparisonSortDirection: string;
                                    };
                                };
                            };
                        };
                    };
                    '/storage-explorer': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
                            };
                        };
                    };
                    '/': {
                        element: React.JSX.Element;
                    };
                };
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                    }>;
                }>;
                defaults: {
                    query: {
                        kuery: string;
                    };
                };
            };
        };
    };
};
export declare const profilingRouter: import("@kbn/typed-react-router-config").Router<{
    '/': {
        element: React.JSX.Element;
        children: {
            '/settings': {
                element: React.JSX.Element;
            };
            '/add-data-instructions': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.TypeC<{
                        selectedTab: t.UnionC<[t.LiteralC<AddDataTabs.Binary>, t.LiteralC<AddDataTabs.Deb>, t.LiteralC<AddDataTabs.Docker>, t.LiteralC<AddDataTabs.ElasticAgentIntegration>, t.LiteralC<AddDataTabs.Kubernetes>, t.LiteralC<AddDataTabs.RPM>, t.LiteralC<AddDataTabs.Symbols>]>;
                    }>;
                }>;
                defaults: {
                    query: {
                        selectedTab: AddDataTabs;
                    };
                };
            };
            '/delete_data_instructions': {
                element: React.JSX.Element;
            };
            '/profiling-not-enabled': {
                element: React.JSX.Element;
            };
            '/': {
                children: {
                    '/stacktraces/{topNType}': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            path: t.TypeC<{
                                topNType: t.UnionC<[t.LiteralC<TopNType.Containers>, t.LiteralC<TopNType.Deployments>, t.LiteralC<TopNType.Executables>, t.LiteralC<TopNType.Hosts>, t.LiteralC<TopNType.Threads>, t.LiteralC<TopNType.Traces>]>;
                            }>;
                            query: t.TypeC<{
                                displayAs: t.UnionC<[t.LiteralC<StackTracesDisplayOption.StackTraces>, t.LiteralC<StackTracesDisplayOption.Percentage>]>;
                                limit: t.Type<number, number, unknown>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                displayAs: StackTracesDisplayOption;
                                limit: string;
                            };
                        };
                    };
                    '/stacktraces': {
                        element: React.JSX.Element;
                    };
                    '/flamegraphs': {
                        element: React.JSX.Element;
                        children: {
                            '/flamegraphs/flamegraph': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.PartialC<{
                                        searchText: t.StringC;
                                    }>;
                                }>;
                            };
                            '/flamegraphs/differential': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        comparisonRangeFrom: t.StringC;
                                        comparisonRangeTo: t.StringC;
                                        comparisonKuery: t.StringC;
                                        comparisonMode: t.UnionC<[t.LiteralC<ComparisonMode.Absolute>, t.LiteralC<ComparisonMode.Relative>]>;
                                        normalizationMode: t.UnionC<[t.LiteralC<NormalizationMode.Scale>, t.LiteralC<NormalizationMode.Time>]>;
                                    }>, t.PartialC<{
                                        baseline: t.Type<number, number, unknown>;
                                        comparison: t.Type<number, number, unknown>;
                                        searchText: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        comparisonRangeFrom: string;
                                        comparisonRangeTo: string;
                                        comparisonKuery: string;
                                        comparisonMode: ComparisonMode;
                                        normalizationMode: NormalizationMode;
                                    };
                                };
                            };
                        };
                    };
                    '/functions': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                sortField: t.UnionC<[t.LiteralC<TopNFunctionSortField.Rank>, t.LiteralC<TopNFunctionSortField.Frame>, t.LiteralC<TopNFunctionSortField.Samples>, t.LiteralC<TopNFunctionSortField.SelfCPU>, t.LiteralC<TopNFunctionSortField.TotalCPU>, t.LiteralC<TopNFunctionSortField.Diff>, t.LiteralC<TopNFunctionSortField.AnnualizedCo2>, t.LiteralC<TopNFunctionSortField.AnnualizedDollarCost>]>;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                sortField: TopNFunctionSortField;
                                sortDirection: string;
                            };
                        };
                        children: {
                            '/functions/topn': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.PartialC<{
                                        pageIndex: t.Type<number, number, unknown>;
                                        searchFunctionName: t.StringC;
                                    }>;
                                }>;
                            };
                            '/functions/differential': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        comparisonRangeFrom: t.StringC;
                                        comparisonRangeTo: t.StringC;
                                        comparisonKuery: t.StringC;
                                        normalizationMode: t.UnionC<[t.LiteralC<NormalizationMode.Scale>, t.LiteralC<NormalizationMode.Time>]>;
                                        comparisonSortField: t.UnionC<[t.LiteralC<TopNComparisonFunctionSortField.ComparisonRank>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonFrame>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonSamples>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonSelfCPU>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonTotalCPU>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonDiff>]>;
                                        comparisonSortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                    }>, t.PartialC<{
                                        baseline: t.Type<number, number, unknown>;
                                        comparison: t.Type<number, number, unknown>;
                                        pageIndex: t.Type<number, number, unknown>;
                                        searchFunctionName: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        comparisonRangeFrom: string;
                                        comparisonRangeTo: string;
                                        comparisonKuery: string;
                                        normalizationMode: NormalizationMode;
                                        comparisonSortField: TopNComparisonFunctionSortField;
                                        comparisonSortDirection: string;
                                    };
                                };
                            };
                        };
                    };
                    '/storage-explorer': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
                            };
                        };
                    };
                    '/': {
                        element: React.JSX.Element;
                    };
                };
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                    }>;
                }>;
                defaults: {
                    query: {
                        kuery: string;
                    };
                };
            };
        };
    };
}>;
export type ProfilingRoutes = typeof routes;
export type ProfilingRouter = typeof profilingRouter;
export {};
