import * as rt from 'io-ts';
export declare const logEntryExampleRT: rt.TypeC<{
    id: rt.StringC;
    dataset: rt.StringC;
    message: rt.StringC;
    timestamp: rt.NumberC;
    tiebreaker: rt.NumberC;
}>;
export type LogEntryExample = rt.TypeOf<typeof logEntryExampleRT>;
