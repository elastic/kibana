/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana as useKibanaGeneric } from '@kbn/kibana-react-plugin/public';
import type { StartServices } from '../../../types';

export const useKibana = useKibanaGeneric<StartServices>;
