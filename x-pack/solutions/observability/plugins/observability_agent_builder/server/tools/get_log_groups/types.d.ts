import type { buildApmResources } from '../../utils/build_apm_resources';
export type ApmEventClient = Awaited<ReturnType<typeof buildApmResources>>['apmEventClient'];
