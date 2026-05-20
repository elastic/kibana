import * as t from 'io-ts';
export declare const DEFAULT_ANNOTATION_INDEX = "observability-annotations";
export declare const rectFill: t.UnionC<[t.LiteralC<"inside">, t.LiteralC<"outside">]>;
export declare const createAnnotationRt: t.IntersectionC<[t.TypeC<{
    annotation: t.PartialC<{
        title: t.StringC;
        type: t.StringC;
        style: t.PartialC<{
            icon: t.StringC;
            color: t.StringC;
            line: t.PartialC<{
                width: t.NumberC;
                style: t.UnionC<[t.LiteralC<"dashed">, t.LiteralC<"solid">, t.LiteralC<"dotted">]>;
                iconPosition: t.UnionC<[t.LiteralC<"top">, t.LiteralC<"bottom">]>;
                textDecoration: t.UnionC<[t.LiteralC<"none">, t.LiteralC<"name">]>;
            }>;
            rect: t.PartialC<{
                fill: t.UnionC<[t.LiteralC<"inside">, t.LiteralC<"outside">]>;
            }>;
        }>;
    }>;
    '@timestamp': t.Type<string, string, unknown>;
    message: t.StringC;
}>, t.PartialC<{
    event: t.IntersectionC<[t.TypeC<{
        start: t.Type<string, string, unknown>;
    }>, t.PartialC<{
        end: t.Type<string, string, unknown>;
    }>]>;
    tags: t.ArrayC<t.StringC>;
    service: t.PartialC<{
        name: t.StringC;
        environment: t.StringC;
        version: t.StringC;
    }>;
    monitor: t.PartialC<{
        id: t.StringC;
    }>;
    slo: t.IntersectionC<[t.TypeC<{
        id: t.StringC;
    }>, t.PartialC<{
        instanceId: t.StringC;
    }>]>;
    host: t.PartialC<{
        name: t.StringC;
    }>;
}>]>;
export declare const deleteAnnotationRt: t.TypeC<{
    id: t.StringC;
}>;
export declare const getAnnotationByIdRt: t.TypeC<{
    id: t.StringC;
}>;
export declare const findAnnotationRt: t.PartialC<{
    query: t.StringC;
    start: t.StringC;
    end: t.StringC;
    sloId: t.StringC;
    sloInstanceId: t.StringC;
    serviceName: t.StringC;
    filter: t.StringC;
    size: t.NumberC;
}>;
export declare const updateAnnotationRt: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
}>, t.IntersectionC<[t.TypeC<{
    annotation: t.PartialC<{
        title: t.StringC;
        type: t.StringC;
        style: t.PartialC<{
            icon: t.StringC;
            color: t.StringC;
            line: t.PartialC<{
                width: t.NumberC;
                style: t.UnionC<[t.LiteralC<"dashed">, t.LiteralC<"solid">, t.LiteralC<"dotted">]>;
                iconPosition: t.UnionC<[t.LiteralC<"top">, t.LiteralC<"bottom">]>;
                textDecoration: t.UnionC<[t.LiteralC<"none">, t.LiteralC<"name">]>;
            }>;
            rect: t.PartialC<{
                fill: t.UnionC<[t.LiteralC<"inside">, t.LiteralC<"outside">]>;
            }>;
        }>;
    }>;
    '@timestamp': t.Type<string, string, unknown>;
    message: t.StringC;
}>, t.PartialC<{
    event: t.IntersectionC<[t.TypeC<{
        start: t.Type<string, string, unknown>;
    }>, t.PartialC<{
        end: t.Type<string, string, unknown>;
    }>]>;
    tags: t.ArrayC<t.StringC>;
    service: t.PartialC<{
        name: t.StringC;
        environment: t.StringC;
        version: t.StringC;
    }>;
    monitor: t.PartialC<{
        id: t.StringC;
    }>;
    slo: t.IntersectionC<[t.TypeC<{
        id: t.StringC;
    }>, t.PartialC<{
        instanceId: t.StringC;
    }>]>;
    host: t.PartialC<{
        name: t.StringC;
    }>;
}>]>]>;
export type CreateAnnotationParams = t.TypeOf<typeof createAnnotationRt>;
export type DeleteAnnotationParams = t.TypeOf<typeof deleteAnnotationRt>;
export type GetByIdAnnotationParams = t.TypeOf<typeof getAnnotationByIdRt>;
export type FindAnnotationParams = t.TypeOf<typeof findAnnotationRt>;
export type Annotation = t.TypeOf<typeof updateAnnotationRt>;
