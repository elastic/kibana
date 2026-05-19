import type { UMElasticsearchQueryFn } from '../adapters';
import type { RefResult, FullScreenshot } from '../../../../common/runtime_types/ping/synthetics';
export type ScreenshotReturnTypesUnion = ((FullScreenshot | RefResult) & {
    totalSteps: number;
}) | null;
export declare const getJourneyScreenshot: UMElasticsearchQueryFn<{
    checkGroup: string;
    stepIndex: number;
}, ScreenshotReturnTypesUnion>;
