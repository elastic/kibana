import type { Annotation } from '../../../common/annotations';
export declare const formatAnnotation: (annotation: Annotation) => {
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
