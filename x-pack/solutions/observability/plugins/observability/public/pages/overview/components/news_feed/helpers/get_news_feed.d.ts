import type { HttpSetup } from '@kbn/core/public';
export interface NewsItem {
    title: {
        en: string;
    };
    description: {
        en: string;
    };
    link_url: {
        en: string;
    };
    image_url?: {
        en: string;
    } | null;
}
interface NewsFeed {
    items: NewsItem[];
}
export declare function getNewsFeed({ http, kibanaVersion, }: {
    http: HttpSetup;
    kibanaVersion: string;
}): Promise<NewsFeed>;
export {};
