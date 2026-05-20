import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
declare const getSLOLinkData: (rule: Rule) => {
    urlParams: {
        sloId: string;
    };
    buttonText: string;
    locatorId: string;
} | {
    urlParams: undefined;
    buttonText: string;
    locatorId: string;
};
export { getSLOLinkData };
