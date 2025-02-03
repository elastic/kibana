## Feature flags and advanced settings

To set up a flagged feature or other advanced setting, add the name of the feature key (`observability:myFeature`) to [common/ui_settings_keys.ts](../common/ui_settings_keys.ts) and the feature parameters to [server/ui_settings.ts](../server/ui_settings.ts).

Test for the feature like:

```js
import { myFeatureEnabled } from '../ui_settings_keys';
if (core.uiSettings.get(myFeatureEnabled)) {
  doStuff();
}
```

In order for telemetry to be collected, the keys and types need to be added in [src/platform/plugins/private/kibana_usage_collection/server/collectors/management/schema.ts](../../../../../../src/platform/plugins/private/kibana_usage_collection/server/collectors/management/schema.ts) and [src/platform/plugins/private/kibana_usage_collection/server/collectors/management/types.ts](../../../../../../src/platform/plugins/private/kibana_usage_collection/server/collectors/management/types.ts).

Settings can be managed in Kibana under Stack Management > Advanced Settings > Observability.
