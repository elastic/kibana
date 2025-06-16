/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkErrorDetails } from './check_error_details';

describe('checkErrorDetails', () => {
  describe('syntax errors', () => {
    it('should mark as user error from search response body', () => {
      const errorResponse = {
        errBody: {
          error: {
            root_cause: [
              {
                type: 'parsing_exception',
                reason:
                  "line 1:33: mismatched input '|' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup', DEV_CHANGE_POINT, DEV_INLINESTATS, DEV_LOOKUP, DEV_JOIN_LEFT, DEV_JOIN_RIGHT}",
              },
            ],
            type: 'parsing_exception',
            reason:
              "line 1:33: mismatched input '|' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup', DEV_CHANGE_POINT, DEV_INLINESTATS, DEV_LOOKUP, DEV_JOIN_LEFT, DEV_JOIN_RIGHT}",
            caused_by: {
              type: 'input_mismatch_exception',
              reason: null,
            },
          },
        },
      };

      expect(checkErrorDetails(errorResponse)).toHaveProperty('isUserError', true);
    });

    it('should mark as user error from error message', () => {
      const errorMessage = `parsing_exception
        Caused by:
            input_mismatch_exception: null
        Root causes:
            parsing_exception: line 1:33: mismatched input '|' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup', DEV_CHANGE_POINT, DEV_INLINESTATS, DEV_LOOKUP, DEV_JOIN_LEFT, DEV_JOIN_RIGHT}
    `;

      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', true);
    });
    it('should mark string literal error as user error from error message', () => {
      const errorMessage = `parsing_exception
	Root causes:
		parsing_exception: line 1:28: Use double quotes ["] to define string literals, not single quotes [']`;
      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', true);
    });
  });

  describe('data source verification errors', () => {
    it('should mark as user error when index_not_found exceptoin', () => {
      const errorMessage = `index_not_found_exception
	Root causes:
		index_not_found_exception: no such index [logs-ti_rapid7_threat_command_latest.vulnerability]`;
      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', true);
    });
    it('should mark as user error from search response body', () => {
      const errorResponse = {
        errBody: {
          error: {
            root_cause: [
              {
                type: 'verification_exception',
                reason:
                  'Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
              },
            ],
            type: 'verification_exception',
            reason:
              'Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
          },
        },
      };

      expect(checkErrorDetails(errorResponse)).toHaveProperty('isUserError', true);
    });

    it('should mark as user error from error message', () => {
      const errorMessage = `verification_exception
	Root causes:
		verification_exception: Found 1 problem
line 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode
`;

      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', true);
    });
  });

  describe('missing ml job errors', () => {
    it('should mark as user error error string', () => {
      const errorMessage = `problem_child_rare_process_by_user missing`;
      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', true);
    });
  });

  describe('license errors', () => {
    it('should mark as user error from search response body', () => {
      const errorResponse = {
        errBody: {
          error: {
            root_cause: [
              {
                type: 'status_exception',
                reason:
                  'A valid Enterprise license is required to run ES|QL cross-cluster searches. License found: active basic license',
              },
            ],
            type: 'status_exception',
            reason:
              'A valid Enterprise license is required to run ES|QL cross-cluster searches. License found: active basic license',
          },
        },
      };

      expect(checkErrorDetails(errorResponse)).toHaveProperty('isUserError', true);
    });

    it('should mark as user error from error message', () => {
      const errorMessage = `status_exception
	Root causes:
		status_exception: A valid Enterprise license is required to run ES|QL cross-cluster searches. License found: active basic license
`;

      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', true);
    });
  });

  describe('non user errors', () => {
    it('should not mark as user error shard exception', () => {
      const errorResponse = {
        errBody: {
          error: {
            root_cause: [
              {
                type: 'no_shard_available_action_exception',
              },
            ],
            type: 'no_shard_available_action_exception',
          },
        },
      };
      expect(checkErrorDetails(errorResponse)).toHaveProperty('isUserError', false);
    });
    it('should not mark as user error from search response body', () => {
      const errorResponse = {
        errBody: {
          error: {
            root_cause: [
              {
                type: 'unknown_exception',
              },
            ],
            type: 'unknown_exception',
          },
        },
      };

      expect(checkErrorDetails(errorResponse)).toHaveProperty('isUserError', false);
    });

    it('should not mark as user error from error message', () => {
      const errorMessage = `Fatal server error`;

      expect(checkErrorDetails(new Error(errorMessage))).toHaveProperty('isUserError', false);
    });
  });
});
