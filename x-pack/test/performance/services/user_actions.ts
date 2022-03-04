/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext, FtrService } from '../ftr_provider_context';

interface InputProfile {
  INPUT_DELAYS: {
    TYPING: number;
    MOUSE_CLICK: number;
  };
}

export class UserActionsService extends FtrService {
  private PROFILES: Record<string, InputProfile> = {
    CI: {
      INPUT_DELAYS: {
        TYPING: 500,
        MOUSE_CLICK: 1000,
      },
    },
    DEVELOPMENT: {
      INPUT_DELAYS: {
        TYPING: 5,
        MOUSE_CLICK: 5,
      },
    },
  };

  constructor(ctx: FtrProviderContext) {
    super(ctx);
  }

  getDelays() {
    const PROFILE = process.env.USER_INPUT_PROFILE ?? 'DEVELOPMENT';
    return this.PROFILES[`${PROFILE}`];
  }
}
