/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_HOST_OS_FULL,
  ATTR_HOST_OS_PLATFORM,
  ATTR_NETWORK_CARRIER_ICC,
  ATTR_NETWORK_CARRIER_NAME,
  ATTR_NETWORK_CONNECTION_TYPE,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
} from '@kbn/observability-ui-semantic-conventions';
import {
  CARRIER_LOCATION,
  CARRIER_NAME,
  CONNECTION_TYPE,
  DEVICE_MODEL,
  HOST_OS,
  OS_PLATFORM,
  SERVICE_VERSION,
  URL_LABEL,
} from '../constants/labels';

export const MobileFields: Record<string, string> = {
  [ATTR_HOST_OS_PLATFORM]: OS_PLATFORM,
  [ATTR_HOST_OS_FULL]: HOST_OS,
  [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  [ATTR_NETWORK_CARRIER_ICC]: CARRIER_LOCATION,
  [ATTR_NETWORK_CARRIER_NAME]: CARRIER_NAME,
  [ATTR_NETWORK_CONNECTION_TYPE]: CONNECTION_TYPE,
  'labels.device_model': DEVICE_MODEL,
  [ATTR_URL_FULL]: URL_LABEL,
};
