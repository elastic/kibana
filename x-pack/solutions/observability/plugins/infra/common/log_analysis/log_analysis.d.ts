export type JobStatus = 'unknown' | 'missing' | 'initializing' | 'stopped' | 'started' | 'starting' | 'finished' | 'failed';
export type SetupStatus = {
    type: 'initializing';
} | {
    type: 'unknown';
} | {
    type: 'required';
} | {
    type: 'pending';
} | {
    type: 'succeeded';
} | {
    type: 'failed';
    reasons: string[];
} | {
    type: 'skipped';
    newlyCreated?: boolean;
};
/**
 * Maps a job status to the possibility that results have already been produced
 * before this state was reached.
 */
export declare const isJobStatusWithResults: (jobStatus: JobStatus) => boolean;
export declare const isHealthyJobStatus: (jobStatus: JobStatus) => boolean;
/**
 * Maps a setup status to the possibility that results have already been
 * produced before this state was reached.
 */
export declare const isSetupStatusWithResults: (setupStatus: SetupStatus) => setupStatus is {
    type: "skipped";
    newlyCreated?: boolean;
};
export declare const isExampleDataIndex: (indexName: string) => boolean;
