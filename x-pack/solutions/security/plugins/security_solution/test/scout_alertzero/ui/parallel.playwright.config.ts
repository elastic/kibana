/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. See the Elastic License 2.0
 * or the Server Side Public License, SSPL v1, whichever you elect as your use of this file, in
 * accordance with such license terms as may be agreed between you and Elasticsearch B.V.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

export default createPlaywrightConfig({
  testDir: './parallel_tests/',
  workers: 2,
  runGlobalSetup: true,
});
