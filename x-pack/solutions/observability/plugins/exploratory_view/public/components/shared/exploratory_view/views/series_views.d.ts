import type { RefObject } from 'react';
import React from 'react';
import type { PanelId } from '../exploratory_view';
export declare function SeriesViews({ seriesBuilderRef, }: {
    seriesBuilderRef: RefObject<HTMLDivElement>;
    onSeriesPanelCollapse: (panel: PanelId) => void;
}): React.JSX.Element;
