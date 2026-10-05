/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// See: https://github.com/elastic/kibana/issues/117255, this creates mocks to avoid memory leaks from kibana core.

import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
// We _must_ import from the restricted path or we pull in _everything_ including memory leaks from Kibana core
import { ReadOperations, WriteOperations } from '@kbn/alerting-plugin/server/authorization';
import { isMissingUiamApiKeyMessage } from '@kbn/alerting-plugin/server/lib/uiam_api_key_error';
import { RulesNotFoundError } from '@kbn/alerting-plugin/server/rules_client/lib/rules_not_found_error';
import { RulesNotVisibleError } from '@kbn/alerting-plugin/server/rules_client/lib/rules_not_visible_error';

module.exports = {
  parseDuration,
  ReadOperations,
  WriteOperations,
  isMissingUiamApiKeyMessage,
  RulesNotFoundError,
  RulesNotVisibleError,
};
