/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/solutions/security/plugins/entity_store/test/scout_cps_local/api/playwright.config.ts
import { createPlaywrightConfig } from '@kbn/scout-security';

export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
========
/** Props for variant body + footer (modal chrome lives in the parent). */
export interface AnnouncementModalVariantProps {
  onContinue: () => void;
  onRevert: () => void;
}
>>>>>>>> 9.4:x-pack/platform/packages/shared/agent-builder/agent-builder-browser/announcement_modal/variants/types.ts
