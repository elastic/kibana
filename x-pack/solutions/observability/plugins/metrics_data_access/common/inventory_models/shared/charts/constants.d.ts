import type { XYLegendValue } from '@kbn/chart-expressions-common';
import type { LensXYConfigBase } from '@kbn/lens-embeddable-utils';
export * from './labels';
export declare const DEFAULT_XY_FITTING_FUNCTION: Pick<LensXYConfigBase, 'fittingFunction'>;
export declare const DEFAULT_XY_HIDDEN_LEGEND: Pick<LensXYConfigBase, 'legend'>;
export declare const DEFAULT_XY_LEGEND: Pick<LensXYConfigBase, 'legend'>;
export declare const DEFAULT_LEGEND_STATS: XYLegendValue[];
export declare const DEFAULT_XY_YBOUNDS: Pick<LensXYConfigBase, 'yBounds'>;
export declare const DEFAULT_XY_HIDDEN_AXIS_TITLE: Pick<LensXYConfigBase, 'axisTitleVisibility'>;
