import type { SeriesConfig, SeriesUrl } from '../types';
interface UseDiscoverLink {
    seriesConfig?: SeriesConfig;
    series: SeriesUrl;
}
export declare const useDiscoverLink: ({ series, seriesConfig }: UseDiscoverLink) => {
    href: string;
    onClick: (event: React.MouseEvent) => Promise<void> | undefined;
};
export {};
