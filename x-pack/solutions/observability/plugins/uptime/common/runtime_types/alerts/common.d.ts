import * as t from 'io-ts';
export declare const UptimeCommonStateType: t.IntersectionC<[t.PartialC<{
    currentTriggerStarted: t.StringC;
    firstTriggeredAt: t.StringC;
    lastTriggeredAt: t.StringC;
    lastResolvedAt: t.StringC;
}>, t.TypeC<{
    firstCheckedAt: t.StringC;
    lastCheckedAt: t.StringC;
    isTriggered: t.BooleanC;
}>]>;
export type UptimeCommonState = t.TypeOf<typeof UptimeCommonStateType>;
