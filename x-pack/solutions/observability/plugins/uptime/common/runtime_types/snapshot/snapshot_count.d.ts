import * as t from 'io-ts';
export declare const SnapshotType: t.TypeC<{
    down: t.NumberC;
    total: t.NumberC;
    up: t.NumberC;
}>;
export type Snapshot = t.TypeOf<typeof SnapshotType>;
