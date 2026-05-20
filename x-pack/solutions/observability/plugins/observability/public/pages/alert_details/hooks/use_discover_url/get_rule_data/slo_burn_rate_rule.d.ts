import type { TopAlert } from '../../../../../typings/alerts';
export declare const getSLOBurnRateRuleData: ({ alert }: {
    alert: TopAlert;
}) => {
    discoverAppLocatorParams: {
        dataViewId: string;
    };
} | {
    discoverAppLocatorParams?: undefined;
};
