/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathsOf, TypeOf } from '@kbn/typed-react-router-config';
import { useParams } from '@kbn/typed-react-router-config';
import type { DigitalExperienceRoutes } from '../routes';

export const useDigitalExperienceParams = <TPath extends PathsOf<DigitalExperienceRoutes>>(
  path: TPath
): TypeOf<DigitalExperienceRoutes, TPath> =>
  useParams(path)! as TypeOf<DigitalExperienceRoutes, TPath>;
