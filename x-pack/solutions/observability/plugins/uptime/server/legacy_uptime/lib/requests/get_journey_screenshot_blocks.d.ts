import type { ScreenshotBlockDoc } from '../../../../common/runtime_types';
import type { UMElasticsearchQueryFn } from '../adapters/framework';
export declare const getJourneyScreenshotBlocks: UMElasticsearchQueryFn<{
    blockIds: string[];
}, ScreenshotBlockDoc[]>;
