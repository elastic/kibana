/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey } from '../product_features_keys';
import type { RulesProductFeaturesConfig } from './types';
import {securityDefaultProductFeaturesConfig} from '../security/product_feature_config'
import { pick } from 'lodash';

export const rulesDefaultProductFeaturesConfig: RulesProductFeaturesConfig = pick(securityDefaultProductFeaturesConfig, [ProductFeatureSecurityKey.externalDetections, ProductFeatureSecurityKey.detections])
