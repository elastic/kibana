import { COMPARATORS } from '@kbn/alerting-comparators';
export declare enum LEGACY_COMPARATORS {
    OUTSIDE_RANGE = "outside"
}
export type LegacyComparator = COMPARATORS | LEGACY_COMPARATORS;
export declare function convertToBuiltInComparators(comparator: LegacyComparator): COMPARATORS;
