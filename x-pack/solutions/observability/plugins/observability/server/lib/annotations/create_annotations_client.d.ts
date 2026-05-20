import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { Annotation, CreateAnnotationParams, DeleteAnnotationParams, FindAnnotationParams, GetByIdAnnotationParams } from '../../../common/annotations';
export declare function createAnnotationsClient(params: {
    index: string;
    esClient: ElasticsearchClient;
    logger: Logger;
    license?: ILicense;
}): {
    index: string;
    create: (createParams: CreateAnnotationParams) => Promise<{
        _id: string;
        _index: string;
        _source: Annotation;
    }>;
    update: (updateParams: Annotation) => Promise<{
        _id: string;
        _index: string;
        _source: Annotation;
    }>;
    getById: (getByIdParams: GetByIdAnnotationParams) => Promise<{
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
    find: (findParams: FindAnnotationParams) => Promise<{
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
    delete: (deleteParams: DeleteAnnotationParams) => Promise<import("@elastic/elasticsearch/lib/api/types").DeleteByQueryResponse>;
    permissions: () => Promise<{
        index: string;
        hasGoldLicense: boolean;
    }>;
};
