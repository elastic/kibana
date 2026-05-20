import type { ExitSpanSample } from '../../data_registry/data_registry_types';
import type { ConnectionWithKey } from './types';
export declare const buildConnectionKey: (sourceName: string, dependencyName: string) => string;
export declare function buildConnectionsFromSpans(spans: ExitSpanSample[]): ConnectionWithKey[];
