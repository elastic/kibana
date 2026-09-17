/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NightshiftStartDependencies } from '../types';

/**
 * Flat `core & dependencies` shape, mirroring the observability plugin's
 * `StartServices` this app was extracted from, so consumers keep destructuring
 * `useKibana().services` directly.
 */
export type StartServices = CoreStart & NightshiftStartDependencies;

const useTypedKibana = () => useKibana<StartServices>();

export { useTypedKibana as useKibana };
