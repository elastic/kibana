import { type FieldDescriptor } from '@kbn/data-views-plugin/server';
import type { UptimeEsClient } from '../lib';
export interface IndexPatternTitleAndFields {
    title: string;
    fields: FieldDescriptor[];
}
export declare const getUptimeIndexPattern: ({ uptimeEsClient, }: {
    uptimeEsClient: UptimeEsClient;
}) => Promise<IndexPatternTitleAndFields | undefined>;
