import { FtrConfigProviderContext } from '@kbn/test';

import { SecuritySolutionServerlessVisualTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlSecConfig = await readConfigFile(require.resolve('./config.ts'));

  return {
    ...svlSecConfig.getAll(),
    testRunner: SecuritySolutionServerlessVisualTestRunner,
  };
}