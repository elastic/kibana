import type { LocatorDefinition } from '@kbn/share-plugin/common';
import { type SerializableRecord } from '@kbn/utility-types';
export interface CasesOverviewLocatorParams extends SerializableRecord {
    spaceId?: string;
    basePath?: string;
}
export interface CasesLocatorParams extends CasesOverviewLocatorParams {
    caseId: string;
}
export declare const CASE_DETAIL_PATH = "/app/observability/cases";
export declare const CaseDetailsLocatorDefinition: () => LocatorDefinition<CasesLocatorParams>;
export declare const CasesOverviewLocatorDefinition: () => LocatorDefinition<CasesOverviewLocatorParams>;
