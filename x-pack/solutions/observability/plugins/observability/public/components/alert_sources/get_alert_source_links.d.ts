import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Group, TimeRange } from '../../../common/typings';
export declare const infraSources: string[];
export declare const apmSources: string[];
export declare const generateSourceLink: ({ field, value }: Group, timeRange: TimeRange, prepend?: (url: string) => string, serviceName?: string, baseLocator?: LocatorPublic<SerializableRecord>) => string | undefined;
