import type { Subject } from 'rxjs';
import type { AppUpdater, ApplicationStart, AppDeepLink } from '@kbn/core/public';
import { type PricingServiceStart } from '@kbn/core/public';
export declare function updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing, }: {
    capabilities: ApplicationStart['capabilities'];
    deepLinks: AppDeepLink[];
    updater$: Subject<AppUpdater>;
    pricing: PricingServiceStart;
}): void;
