/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux-v7';
import { signalIndexOutdatedSelector } from '@kbn/data-view-manager';

/**
 * Returns whether the signal index mapping is outdated.
 */
export const useSignalIndexMappingOutdated = () => useSelector(signalIndexOutdatedSelector);
