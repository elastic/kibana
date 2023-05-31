import { FtrConfigProviderContext } from '@kbn/test';

import { SecuritySolutionServerlessTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlSharedConfig = await readConfigFile(require.resolve('../../shared/config.base.ts'));

  return {
    ...svlSharedConfig.getAll(),
    kbnTestServer: {
      ...svlSharedConfig.get('kbnTestServer'),
      serverArgs: [
        ...svlSharedConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        '--serverless=security',
        ],
    },
  };
}