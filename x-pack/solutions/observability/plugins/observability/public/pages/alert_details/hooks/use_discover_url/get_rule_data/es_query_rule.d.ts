import type { TopAlert } from '../../../../../typings/alerts';
export declare const getEsQueryRuleData: ({ alert }: {
    alert: TopAlert;
}) => {
    discoverUrl: string;
} | {
    discoverUrl?: undefined;
};
