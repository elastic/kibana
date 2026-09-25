/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { buildExceptionEntriesFilterStepDefinition } from './build_exception_entries_filter_step';
import { buildExceptionEntriesFilterInputSchema } from '../../../../common/workflows/step_types/build_exception_entries_filter_step/build_exception_entries_filter_step_common';

type Context = StepHandlerContext<typeof buildExceptionEntriesFilterInputSchema>;

const runHandler = async (userInput: unknown) => {
  const context = {
    input: buildExceptionEntriesFilterInputSchema.parse(userInput),
  } as unknown as Context;
  const result = await buildExceptionEntriesFilterStepDefinition.handler(context);
  if (!result.output) {
    throw new Error('handler did not return output');
  }
  return result.output;
};

describe('buildExceptionEntriesFilterStepDefinition', () => {
  it('ANDs every entry into one bool.filter clause, then negates the whole thing', async () => {
    const output = await runHandler({
      entries: [
        { field: 'host.name', operator: 'is', value: 'admin-workstation-04' },
        { field: 'user.name', operator: 'is_one_of', values: ['svc-patching', 'svc-backup'] },
      ],
    });

    expect(output).toEqual({
      filters: [
        {
          bool: {
            must_not: {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'host.name': 'admin-workstation-04' } }],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [{ match_phrase: { 'user.name': 'svc-patching' } }],
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [{ match_phrase: { 'user.name': 'svc-backup' } }],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    });
  });

  it('preserves existing_filters and appends the new one', async () => {
    const existingFilter = { term: { 'kibana.alert.workflow_status': 'open' } };

    const output = await runHandler({
      existing_filters: [existingFilter],
      entries: [{ field: 'agent.id', operator: 'exists' }],
    });

    expect(output.filters).toHaveLength(2);
    expect(output.filters[0]).toStrictEqual(existingFilter);
  });

  it('covers every operator, matching the same type/operator mapping create_rule_exception_step uses', async () => {
    const output = await runHandler({
      entries: [
        { field: 'host.name', operator: 'is', value: 'build-agent-01' },
        { field: 'user.name', operator: 'is_not', value: 'root' },
        { field: 'process.name', operator: 'is_one_of', values: ['a.exe', 'b.exe'] },
        { field: 'user.domain', operator: 'is_not_one_of', values: ['CORP'] },
        { field: 'file.path', operator: 'matches', value: 'C:\\temp\\*' },
        { field: 'file.name', operator: 'does_not_match', value: '*.tmp' },
        { field: 'agent.id', operator: 'exists' },
        { field: 'user.email', operator: 'does_not_exist' },
      ],
    });

    // is_not / does_not_match / is_not_one_of / does_not_exist each wrap their clause
    // in an extra must_not, matching buildExclusionClause's behavior for `excluded`.
    expect(output.filters[0]).toMatchObject({
      bool: {
        must_not: {
          bool: {
            filter: [
              expect.not.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.not.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.not.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.not.objectContaining({ bool: { must_not: expect.anything() } }),
              expect.objectContaining({ bool: { must_not: expect.anything() } }),
            ],
          },
        },
      },
    });
  });

  it('defaults existing_filters to an empty array when omitted', async () => {
    const output = await runHandler({
      entries: [{ field: 'host.name', operator: 'is', value: 'x' }],
    });

    expect(output.filters).toHaveLength(1);
  });
});
