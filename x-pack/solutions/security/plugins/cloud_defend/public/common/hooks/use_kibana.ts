/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana as useKibanaBase } from '@kbn/kibana-react-plugin/public';
import type { CloudDefendPluginStartDeps } from '../../types';

type CloudDefendKibanaContext = CoreStart & CloudDefendPluginStartDeps;

export const useKibana = () => useKibanaBase<CloudDefendKibanaContext>();
