import type { DataViewsService } from '@kbn/data-views-plugin/server';
import type { TransformGenerator } from '.';
import type { IndicatorTypes } from '../../domain/models';
export declare function createTransformGenerators(spaceId: string, dataViewsService: DataViewsService, isServerless: boolean): Record<IndicatorTypes, TransformGenerator>;
