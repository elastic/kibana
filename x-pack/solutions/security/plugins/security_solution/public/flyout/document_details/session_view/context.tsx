/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessEvent } from '@kbn/session-view-plugin/common';

export interface CustomProcess {
  /**
   * Id of the process
   */
  id: string;
  /**
   * Details of the process (see implementation under getDetailsMemo here: x-pack/plugins/session_view/public/components/process_tree/hooks.ts)
   */
  details: ProcessEvent;
  /**
   * Timestamp of the 'end' event (see implementation under getEndTime here x-pack/plugins/session_view/public/components/process_tree/hooks.ts)
   */
  endTime: string;
}
