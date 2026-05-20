import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityPublicPluginsStart } from '../plugin';
import type { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
export declare const registerObservabilityRuleTypes: (observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry, uiSettings: IUiSettingsClient, getStartServices: () => Promise<[CoreStart, ObservabilityPublicPluginsStart, unknown]>, logsLocator?: LocatorPublic<DiscoverAppLocatorParams>) => void;
