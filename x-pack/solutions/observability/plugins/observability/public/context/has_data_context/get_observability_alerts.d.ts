import type { HttpSetup } from '@kbn/core/public';
import type { Rule } from '@kbn/alerting-plugin/common';
export declare function getObservabilityAlerts({ http }: {
    http: HttpSetup;
}): Promise<Rule<never>[]>;
