import React from 'react';
import type { BrushEvent, TooltipSpec, LineAnnotationEvent, RectAnnotationEvent } from '@elastic/charts';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Annotation } from '../../../common/annotations';
export declare const useAnnotations: ({ domain, editAnnotation, slo, setEditAnnotation, }?: {
    slo?: SLOWithSummaryResponse;
    editAnnotation?: Annotation | null;
    setEditAnnotation?: (annotation: Annotation | null) => void;
    domain?: {
        min: number | string;
        max: number | string;
    };
}) => {
    annotations: ({
        id: string;
    } & {
        annotation: {
            title?: string | undefined;
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
    } & {
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
    })[];
    onAnnotationClick: (annotations: {
        rects: RectAnnotationEvent[];
        lines: LineAnnotationEvent[];
    }) => void;
    wrapOnBrushEnd: (originalHandler: (event: BrushEvent) => void) => (event: BrushEvent) => void;
    createAnnotation: (start: string | number, end?: string | null) => void;
    AddAnnotationButton: () => React.JSX.Element;
    ObservabilityAnnotations: ({ tooltipSpecs, annotations, }: {
        tooltipSpecs?: Partial<TooltipSpec>;
        annotations?: Annotation[];
    }) => React.JSX.Element;
};
