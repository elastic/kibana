import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { CasesUiCapabilities, CasesApiTags } from '@kbn/cases-plugin/common';
export declare const getCasesFeature: (casesCapabilities: CasesUiCapabilities, casesApiTags: CasesApiTags) => KibanaFeatureConfig;
