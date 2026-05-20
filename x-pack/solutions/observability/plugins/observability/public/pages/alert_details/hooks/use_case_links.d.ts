import { type Cases } from '@kbn/cases-plugin/common';
interface CaseLinks {
    firstCaseLink: string | null;
    casesOverviewLink: string | null;
}
/**
 * Given a list of cases, returns the link to the first case's detail page,
 * and the link to the overview page if there is > 1 case.
 * @param cases the cases to get links for
 * @returns the first case link and the cases overview link
 */
export declare function useCaseLinks(cases?: Cases): CaseLinks;
export {};
