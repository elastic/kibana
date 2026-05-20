import type { Rule } from '@kbn/alerts-ui-shared';
import { type TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
/**
 * Maps the params for a Synthetics TLS Alert to a KQL query string.
 *
 * @param params from a Synthetics TLS Alert
 * @returns KQL query string
 */
export declare function syntheticsTlsAlertParamsToKqlQuery(params: TLSRuleParams): string;
export declare const getSyntheticsTlsRuleData: ({ rule }: {
    rule: Rule;
}) => {
    discoverAppLocatorParams: {
        query: {
            language: string;
            query: string;
        };
        dataViewSpec: import("@kbn/data-views-plugin/common").DataViewSpec;
    };
};
