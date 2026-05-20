import type { CoreSetup, PluginInitializerContext, KibanaRequest, IScopedClusterClient } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
interface Params {
    index: string;
    core: CoreSetup;
    context: PluginInitializerContext;
}
export type ScopedAnnotationsClientFactory = Awaited<ReturnType<typeof bootstrapAnnotations>>['getScopedAnnotationsClient'];
export type ScopedAnnotationsClient = Awaited<ReturnType<ScopedAnnotationsClientFactory>>;
export type AnnotationsAPI = Awaited<ReturnType<typeof bootstrapAnnotations>>;
export declare function bootstrapAnnotations({ index, core, context }: Params): Promise<{
    getScopedAnnotationsClient: (requestContext: {
        core: Promise<{
            elasticsearch: {
                client: IScopedClusterClient;
            };
        }>;
        licensing: Promise<LicensingApiRequestHandlerContext>;
    }, request: KibanaRequest) => Promise<{
        index: string;
        create: (createParams: import("../../../common/annotations").CreateAnnotationParams) => Promise<{
            _id: string;
            _index: string;
            _source: import("../../../common/annotations").Annotation;
        }>;
        update: (updateParams: import("../../../common/annotations").Annotation) => Promise<{
            _id: string;
            _index: string;
            _source: import("../../../common/annotations").Annotation;
        }>;
        getById: (getByIdParams: import("../../../common/annotations").GetByIdAnnotationParams) => Promise<{
            _source: {
                annotation: {
                    title: string;
                    type?: string | undefined;
                    style?: {
                        icon?: string | undefined;
                        color?: string | undefined;
                        line?: {
                            width?: number | undefined;
                            style?: "dashed" | "dotted" | "solid" | undefined;
                            iconPosition?: "top" | "bottom" | undefined;
                            textDecoration?: "name" | "none" | undefined;
                        } | undefined;
                        rect?: {
                            fill?: "inside" | "outside" | undefined;
                        } | undefined;
                    } | undefined;
                };
                id: string;
                '@timestamp': string;
                message: string;
                event?: ({
                    start: string;
                } & {
                    end?: string | undefined;
                }) | undefined;
                tags?: string[] | undefined;
                service?: {
                    name?: string | undefined;
                    environment?: string | undefined;
                    version?: string | undefined;
                } | undefined;
                monitor?: {
                    id?: string | undefined;
                } | undefined;
                slo?: ({
                    id: string;
                } & {
                    instanceId?: string | undefined;
                }) | undefined;
                host?: {
                    name?: string | undefined;
                } | undefined;
            };
            _index: import("@elastic/elasticsearch/lib/api/types").IndexName;
            _id?: import("@elastic/elasticsearch/lib/api/types").Id;
            _score?: import("@elastic/elasticsearch/lib/api/types").double | null;
            _explanation?: import("@elastic/elasticsearch/lib/api/types").ExplainExplanation;
            fields?: Record<string, any>;
            highlight?: Record<string, string[]>;
            inner_hits?: Record<string, import("@elastic/elasticsearch/lib/api/types").SearchInnerHitsResult>;
            matched_queries?: string[] | Record<string, import("@elastic/elasticsearch/lib/api/types").double>;
            _nested?: import("@elastic/elasticsearch/lib/api/types").SearchNestedIdentity;
            _ignored?: string[];
            ignored_field_values?: Record<string, any[]>;
            _shard?: string;
            _node?: string;
            _routing?: string;
            _rank?: import("@elastic/elasticsearch/lib/api/types").integer;
            _seq_no?: import("@elastic/elasticsearch/lib/api/types").SequenceNumber;
            _primary_term?: import("@elastic/elasticsearch/lib/api/types").long;
            _version?: import("@elastic/elasticsearch/lib/api/types").VersionNumber;
            sort?: import("@elastic/elasticsearch/lib/api/types").SortResults;
        }>;
        find: (findParams: import("../../../common/annotations").FindAnnotationParams) => Promise<{
            items: {
                id: string | undefined;
                annotation: {
                    title: string;
                    type?: string | undefined;
                    style?: {
                        icon?: string | undefined;
                        color?: string | undefined;
                        line?: {
                            width?: number | undefined;
                            style?: "dashed" | "dotted" | "solid" | undefined;
                            iconPosition?: "top" | "bottom" | undefined;
                            textDecoration?: "name" | "none" | undefined;
                        } | undefined;
                        rect?: {
                            fill?: "inside" | "outside" | undefined;
                        } | undefined;
                    } | undefined;
                };
                '@timestamp': string;
                message: string;
                event?: ({
                    start: string;
                } & {
                    end?: string | undefined;
                }) | undefined;
                tags?: string[] | undefined;
                service?: {
                    name?: string | undefined;
                    environment?: string | undefined;
                    version?: string | undefined;
                } | undefined;
                monitor?: {
                    id?: string | undefined;
                } | undefined;
                slo?: ({
                    id: string;
                } & {
                    instanceId?: string | undefined;
                }) | undefined;
                host?: {
                    name?: string | undefined;
                } | undefined;
            }[];
            total: number;
        }>;
        delete: (deleteParams: import("../../../common/annotations").DeleteAnnotationParams) => Promise<import("@elastic/elasticsearch/lib/api/types").DeleteByQueryResponse>;
        permissions: () => Promise<{
            index: string;
            hasGoldLicense: boolean;
        }>;
    }>;
}>;
export {};
