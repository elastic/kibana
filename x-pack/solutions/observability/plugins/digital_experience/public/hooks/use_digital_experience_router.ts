/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Router } from '@kbn/typed-react-router-config';
import { useRouter } from '@kbn/typed-react-router-config';
import type { DigitalExperienceRoutes } from '../routes';

/** Typed router of the app, used to build links with `router.link`. */
export const useDigitalExperienceRouter = (): Router<DigitalExperienceRoutes> =>
  useRouter<DigitalExperienceRoutes>();
