import type { CloudStart } from '@kbn/cloud-plugin/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
export interface ProfilingPluginStartDeps {
    fleet?: FleetStartContract;
    cloud?: CloudStart;
}
