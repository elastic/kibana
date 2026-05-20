import type { SpanOptions } from '@kbn/apm-utils';
export declare function withProfilingSpan<T>(optionsOrName: SpanOptions | string, cb: () => Promise<T>): Promise<T>;
