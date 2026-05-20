import type { PartialSetupState, ProfilingSetupOptions } from './setup';
export declare const MAX_BUCKETS = 150000;
export declare function validateMaximumBuckets({ client, }: ProfilingSetupOptions): Promise<PartialSetupState>;
export declare function validateResourceManagement({ client, }: ProfilingSetupOptions): Promise<PartialSetupState>;
export declare function validateProfilingStatus({ client, }: ProfilingSetupOptions): Promise<PartialSetupState>;
