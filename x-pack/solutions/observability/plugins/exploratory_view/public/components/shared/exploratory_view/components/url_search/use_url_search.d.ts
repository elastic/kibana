import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    query?: string;
    seriesId: number;
    series: SeriesUrl;
    seriesConfig: SeriesConfig;
}
export declare const useUrlSearch: ({ series, query, seriesId, seriesConfig }: Props) => {
    values: import("../../../../../../../observability_shared/public/hooks/use_values_list").ListItem[];
    loading: boolean | undefined;
};
export {};
