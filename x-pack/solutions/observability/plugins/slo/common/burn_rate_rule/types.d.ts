import type * as t from 'io-ts';
export declare const DependencyRT: t.TypeC<{
    ruleId: t.StringC;
    actionGroupsToSuppressOn: t.ArrayC<t.StringC>;
}>;
export type Dependency = t.OutputOf<typeof DependencyRT>;
