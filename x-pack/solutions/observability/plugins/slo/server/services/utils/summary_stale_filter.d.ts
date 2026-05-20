import type { estypes } from '@elastic/elasticsearch';
import type { SLOSettings } from '../../domain/models';
interface Props {
    settings: SLOSettings;
    kqlFilter?: string;
    forceExclude?: boolean;
}
export declare function excludeStaleSummaryFilter({ settings, kqlFilter, forceExclude, }: Props): estypes.QueryDslQueryContainer[];
export {};
