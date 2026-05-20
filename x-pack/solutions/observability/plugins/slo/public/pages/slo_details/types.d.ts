export interface SloDetailsPathParams {
    sloId: string;
    tabId?: string;
}
export interface TimeBounds {
    from: Date;
    to: Date;
}
export type SloEventType = 'Good' | 'Bad' | 'All';
