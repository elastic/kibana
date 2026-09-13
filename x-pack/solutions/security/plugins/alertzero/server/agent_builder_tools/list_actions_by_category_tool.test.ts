/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { listActionsByCategoryTool } from './list_actions_by_category_tool';
import type { ActionsService } from '../services/actions/actions_service';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const logger = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() });

const serviceWith = (list: jest.Mock) => ({ list } as unknown as ActionsService);

const run = async (service: ActionsService, input: { categories?: string[] } = {}) => {
  const tool = listActionsByCategoryTool(() => service);
  const result = await tool.handler(input, { logger: logger() } as never);
  if (!('results' in result)) {
    throw new Error('expected a standard tool result');
  }
  return result;
};

const ACTION = (over: Partial<Record<string, unknown>> = {}) => ({
  workflowId: 'system-alertzero-action-create-rule',
  name: 'Create detection rule',
  category: 'tune',
  ...over,
});

describe('listActionsByCategoryTool', () => {
  it('lists all actions when called without categories', async () => {
    const list = jest.fn().mockResolvedValue({
      actions: [ACTION(), ACTION({ workflowId: 'a2', name: 'Isolate host', category: 'contain' })],
      total: 2,
    });
    const result = await run(serviceWith(list));
    expect(list).toHaveBeenCalledWith('default', undefined);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toMatchObject({ total: 2 });
  });

  it('forwards categories to the service and reports empty results explicitly', async () => {
    const list = jest.fn().mockResolvedValue({ actions: [], total: 0 });
    const result = await run(serviceWith(list), { categories: ['escalate'] });
    expect(list).toHaveBeenCalledWith('default', ['escalate']);
    expect(result.results[0].data).toMatchObject({
      total: 0,
      message: 'No actions found in categories: escalate.',
    });
  });

  it('returns an error result instead of throwing when the service fails', async () => {
    const list = jest.fn().mockRejectedValue(new Error('workflows management down'));
    const result = await run(serviceWith(list));
    expect(result.results[0].type).not.toBe(ToolResultType.other);
    expect(JSON.stringify(result.results[0])).toContain('workflows management down');
  });

  it('declares the documented tool id and read-only annotations', () => {
    const tool = listActionsByCategoryTool(() => serviceWith(jest.fn()));
    expect(tool.id).toBe('security.alertzero.actions.list_by_category');
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(tool.type).toBe('builtin');
  });
});
