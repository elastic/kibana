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

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { WorkflowListDto, WorkflowListItemDto } from '@kbn/workflows';
import { ActionsService } from './actions_service';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';

const logger = loggingSystemMock.create().get('alertzero');

const makeManagement = (
  pages: WorkflowListDto[]
): { client: WatchWorkflowsManagementClient; getWorkflows: jest.Mock } => {
  const getWorkflows = jest.fn();
  pages.forEach((page, index) => {
    getWorkflows.mockResolvedValueOnce(page);
    // Any further call falls through with the last page (defensive: service must stop paging).
    if (index === pages.length - 1) {
      getWorkflows.mockResolvedValue(page);
    }
  });
  return {
    getWorkflows,
    client: { getWorkflows } as unknown as WatchWorkflowsManagementClient,
  };
};

const workflowItem = (id: string, actionMetadata: unknown, tags: string[] = ['action']) => ({
  id,
  name: id,
  description: '',
  enabled: true,
  managed: true,
  managedBy: 'alertzero',
  definition: (actionMetadata === null
    ? null
    : { consts: { actionMetadata } }) as WorkflowListItemDto['definition'],
  createdAt: '2026-01-01T00:00:00.000Z',
  tags,
  valid: true,
});

const page = (results: WorkflowListDto['results'], total = results.length): WorkflowListDto => ({
  page: 1,
  size: 100,
  total,
  results,
});

describe('ActionsService', () => {
  it('queries managed workflows tagged action (managed installs, not unmanaged)', async () => {
    const { getWorkflows, client } = makeManagement([page([])]);
    const service = new ActionsService(() => client, logger);
    await service.list('default');
    expect(getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['action'], managedFilter: 'managed' }),
      'default'
    );
  });

  it('projects action workflows to catalog entries', async () => {
    const { client } = makeManagement([
      page([
        workflowItem('action-create-rule', {
          name: 'Create detection rule',
          description: 'Creates a new, disabled custom query detection rule.',
          category: 'tune',
          impact: 'low',
          reversible: true,
          approvalPolicy: 'always-gate',
        }),
      ]),
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default');
    expect(result).toEqual({
      total: 1,
      actions: [
        {
          workflowId: 'action-create-rule',
          name: 'Create detection rule',
          description: 'Creates a new, disabled custom query detection rule.',
          category: 'tune',
          impact: 'low',
          approvalPolicy: 'always-gate',
        },
      ],
    });
  });

  it('filters by category (OR semantics) and omits entries without a category', async () => {
    const { client, getWorkflows } = makeManagement([
      page([
        workflowItem('a-contain', { name: 'A', category: 'contain' }),
        workflowItem('b-escalate', { name: 'B', category: 'escalate' }),
        workflowItem('c-tune', { name: 'C', category: 'tune' }),
        workflowItem('d-uncategorized', { name: 'D' }),
      ]),
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default', ['contain', 'escalate']);
    expect(result.actions.map((a) => a.workflowId)).toEqual(['a-contain', 'b-escalate']);
    expect(result.total).toBe(2);
    // the filter is applied AFTER fetching, so the API still queries by tag only
    expect(getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['action'] }),
      'default'
    );
  });

  it('does not validate categories against an enum — unknown categories just match nothing', async () => {
    const { client } = makeManagement([
      page([workflowItem('a-contain', { name: 'A', category: 'contain' })]),
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default', ['nightshift-specific-category']);
    expect(result).toEqual({ actions: [], total: 0 });
  });

  it('skips workflows with invalid actionMetadata, keeping the rest of the catalog', async () => {
    const { client } = makeManagement([
      page([
        workflowItem('invalid', { name: 'x', impact: 'nuclear' }),
        workflowItem('valid', { name: 'Valid', category: 'contain' }),
      ]),
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default');
    expect(result.actions.map((a) => a.workflowId)).toEqual(['valid']);
  });

  it('skips workflows without actionMetadata', async () => {
    const { client } = makeManagement([
      page([
        workflowItem('no-metadata', undefined),
        workflowItem('null-definition', null),
        workflowItem('valid', { name: 'Valid' }),
      ]),
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default');
    expect(result.actions.map((a) => a.workflowId)).toEqual(['valid']);
  });

  it('pages until all tagged workflows are read', async () => {
    const first = Array.from({ length: 100 }, (_, i) =>
      workflowItem(`wf-${i}`, { name: `wf-${i}` })
    );
    const second = [workflowItem('wf-100', { name: 'wf-100' })];
    const { client, getWorkflows } = makeManagement([
      { ...page(first, 101), page: 1 },
      { ...page(second, 101), page: 2 },
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default');
    expect(result.total).toBe(101);
    expect(getWorkflows).toHaveBeenCalledTimes(2);
    expect(getWorkflows).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, size: 100 }),
      'default'
    );
  });

  it('throws when workflows management is unavailable', async () => {
    const service = new ActionsService(() => undefined, logger);
    await expect(service.list('default')).rejects.toThrow('Workflows management is not available');
  });

  it('sorts entries by name', async () => {
    const { client } = makeManagement([
      page([
        workflowItem('zeta', { name: 'Zeta action' }),
        workflowItem('alpha', { name: 'Alpha action' }),
      ]),
    ]);
    const service = new ActionsService(() => client, logger);
    const result = await service.list('default');
    expect(result.actions.map((a) => a.name)).toEqual(['Alpha action', 'Zeta action']);
  });
});
