
import { type MlPluginSetup } from '@kbn/ml-plugin/public';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
  TriggersAndActionsUIPublicPluginSetup,
} from '@kbn/triggers-actions-ui-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';

export interface ElasticAssistantPublicPluginSetupDependencies {
  ml: MlPluginSetup;
  spaces?: SpacesPluginSetup;
  licensing: LicensingPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}
export interface ElasticAssistantPublicPluginStartDependencies {
  licensing: LicensingPluginStart;
  triggersActionsUi: TriggersActionsStart;
  spaces?: SpacesPluginStart;
  security: SecurityPluginStart;
  productDocBase: ProductDocBasePluginStart;
  discover: DiscoverStart;
}

export type StartServices = CoreStart &
  ElasticAssistantPublicPluginStartDependencies & {
    telemetry: TelemetryServiceStart;
    storage: Storage;
  }
    