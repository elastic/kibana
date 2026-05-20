import React from 'react';
import type { SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
}
export declare const StyledText: import("@emotion/styled").StyledComponent<import("@elastic/eui").CommonProps & Omit<React.HTMLAttributes<HTMLElement>, "color"> & {
    component?: "div" | "span" | "p";
} & import("@elastic/eui/src/components/text/types").EuiTextColors & import("@elastic/eui/src/components/text/types").EuiTextAlignment & {
    size?: import("@elastic/eui/src/components/text/text").TextSize;
    grow?: boolean;
} & {
    theme?: import("@emotion/react").Theme;
}, {}, {}>;
export declare function SeriesName({ series, seriesId }: Props): React.JSX.Element;
export {};
