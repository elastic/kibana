import type { HeatmapVisualizationState } from '@kbn/lens-plugin/public';
import type { LayerConfig } from '../lens_attributes';
import { SingleMetricLensAttributes } from './single_metric_attributes';
export declare class HeatMapLensAttributes extends SingleMetricLensAttributes {
    xColumnId: string;
    layerId: string;
    breakDownColumnId: string;
    constructor(layerConfigs: LayerConfig[], reportType: string);
    getHeatmapState(): HeatmapVisualizationState;
}
