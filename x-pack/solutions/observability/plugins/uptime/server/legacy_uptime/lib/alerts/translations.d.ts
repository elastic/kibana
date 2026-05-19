export declare const commonMonitorStateI18: {
    name: string;
    description: string;
}[];
export declare const commonStateTranslations: {
    name: string;
    description: string;
}[];
export declare const tlsTranslations: {
    alertFactoryName: string;
    legacyAlertFactoryName: string;
    actionVariables: {
        name: string;
        description: string;
    }[];
    validAfterExpiredString: (date: string, relativeDate: number) => string;
    validAfterExpiringString: (date: string, relativeDate: number) => string;
    validBeforeExpiredString: (date: string, relativeDate: number) => string;
    validBeforeExpiringString: (date: string, relativeDate: number) => string;
    expiredLabel: string;
    expiringLabel: string;
    agingLabel: string;
    invalidLabel: string;
};
export declare const durationAnomalyTranslations: {
    alertFactoryName: string;
    actionVariables: {
        name: string;
        description: string;
    }[];
};
export declare const statusCheckTranslations: {
    downMonitorsLabel: (count: number, interval: string, numTimes: number) => string;
    availabilityBreachLabel: (availabilityRatio: string, expectedAvailability: string, interval: string) => string;
    downMonitorsAndAvailabilityBreachLabel: (downMonitorsMessage: string, availabilityBreachMessage: string) => string;
};
