/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { BuildFlavor } from '@kbn/config';
import { AppClient } from './client';
import type { ConfigType } from '../config';
import { invariant } from '../../common/utils/invariant';

interface SetupDependencies {
  config: ConfigType;
  kibanaVersion: string;
  kibanaBranch: string;
  buildFlavor: BuildFlavor;
}

export class AppClientFactory {
  private config?: SetupDependencies['config'];
  private kibanaVersion?: string;
  private kibanaBranch?: string;
  private buildFlavor?: BuildFlavor;

  public setup({ config, kibanaBranch, kibanaVersion, buildFlavor }: SetupDependencies) {
    this.config = config;
    this.kibanaVersion = kibanaVersion;
    this.kibanaBranch = kibanaBranch;
    this.buildFlavor = buildFlavor;
  }

  public create(request: KibanaRequest): AppClient {
    invariant(
      this.config != null,
      'Cannot create AppClient as config is not present. Did you forget to call setup()?'
    );
    invariant(
      this.kibanaVersion != null,
      'Cannot create AppClient as kibanaVersion is not present. Did you forget to call setup()?'
    );
    invariant(
      this.kibanaBranch != null,
      'Cannot create AppClient as kibanaBranch is not present. Did you forget to call setup()?'
    );
    invariant(
      this.buildFlavor != null,
      'Cannot create AppClient as buildFlavor is not present. Did you forget to call setup()?'
    );

    return new AppClient(
      request.spaceId,
      this.config,
      this.kibanaVersion,
      this.kibanaBranch,
      this.buildFlavor
    );
  }
}
