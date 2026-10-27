/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { countsForTree, parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import type { DecisionTreeStore, DecisionTreeDetail } from '../../decision_trees/store';
import { DecisionTreeVersionWriteError } from '../../decision_trees/store';
import { createSubmitOptimizerResultTool } from './submit_optimizer_result_tool';

const TREE_ID = 'symptom:checkout-high-latency';
const FILE_PATH = 'decision-trees/decision_tree_checkout-high-latency.md';
const ABSOLUTE_PATH = `/workspace/${FILE_PATH}`;

const markdownFor = (mermaidBody: string) =>
  `# Checkout\n\n\`\`\`mermaid\n${mermaidBody}\n\`\`\`\n`;

const FULL_TREE = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| E2[Check deploys]
    D1 -->|no| E3[Profile queries]
    E2 --> X1((Connection leak))
    E3 --> X2((Slow query))`;

const stored = (mermaidBody: string): DecisionTreeDetail => ({
  tree_id: TREE_ID,
  symptom: 'checkout-high-latency',
  title: 'Checkout High Latency',
  status: 'tentative',
  version: 1,
  node_count: 5,
  edge_count: 4,
  learning_count: 0,
  updated_at: '2026-09-09T12:00:00.000Z',
  markdown: markdownFor(mermaidBody),
  mermaid: `\`\`\`mermaid\n${mermaidBody}\n\`\`\``,
  evidence_gatherer_metadata: [],
  learnings: [],
  counts: countsForTree(parseMermaidDecisionTree(mermaidBody, TREE_ID)),
});

const createStore = (existing?: DecisionTreeDetail): jest.Mocked<DecisionTreeStore> =>
  ({
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(existing),
    commit: jest.fn().mockResolvedValue(stored(FULL_TREE)),
    updateCounts: jest.fn().mockResolvedValue(stored(FULL_TREE)),
    listVersions: jest.fn().mockResolvedValue([]),
    getVersion: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn(),
  } as jest.Mocked<DecisionTreeStore>);

const createSandboxStart = (markdown: string) => {
  const session = {
    readFiles: jest
      .fn()
      .mockResolvedValue([{ success: true, content: Buffer.from(markdown, 'utf8') }]),
  };
  return {
    session,
    getSandboxStart: () => ({
      getSession: jest.fn().mockReturnValue(session),
    }),
  };
};

const createContext = () => ({
  request: {} as never,
  runContext: { stack: [{ type: 'agent', conversationId: 'conv-1' }] },
  esClient: { asCurrentUser: {} },
  agentConfiguration: { connector_ids: [] },
});

interface EdgeRef {
  source_node_id: string;
  target_node_id: string;
  condition?: string;
}

interface Traversal {
  tree_id: string;
  visited_path: EdgeRef[];
  causal_path: EdgeRef[];
}

const runSubmit = async ({
  store,
  markdown,
  submission,
  edited = true,
  traversals = [],
}: {
  store: jest.Mocked<DecisionTreeStore>;
  markdown: string;
  submission?: Partial<{
    tree_id: string;
    file_path: string;
    evidence_gatherer_metadata: string[];
    merged_nodes: Array<{ from: string[]; into: string }>;
  }>;
  /** When false, the turn submits no file edits, only its traversals. */
  edited?: boolean;
  traversals?: Traversal[];
}) => {
  const { session, getSandboxStart } = createSandboxStart(markdown);
  const tool = createSubmitOptimizerResultTool({
    getSandboxStart: getSandboxStart as never,
    getStore: () => store,
    getSpaceId: () => 'default',
    logger: loggerMock.create(),
  });

  const result = await tool.handler(
    {
      symptom_trees: edited
        ? [
            {
              tree_id: TREE_ID,
              file_path: FILE_PATH,
              evidence_gatherer_metadata: [],
              merged_nodes: [],
              ...submission,
            },
          ]
        : [],
      traversals,
      summary: 'Merged this run.',
    },
    createContext() as never
  );

  return { result, session };
};

describe('nightshift_submit_optimizer_result', () => {
  it('reads the submitted file back from the sandbox and persists it', async () => {
    const store = createStore();

    const { result, session } = await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE),
    });

    expect(session.readFiles).toHaveBeenCalledWith([
      expect.objectContaining({ path: ABSOLUTE_PATH }),
    ]);
    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        treeId: TREE_ID,
        markdown: markdownFor(FULL_TREE),
        author: 'system',
        summary: 'Merged this run.',
        reinforced: false,
        evidenceGathererMetadata: [],
      })
    );
    expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
  });

  it('persists evidence metadata on the committed tree', async () => {
    const store = createStore();
    const metadata = ['E1: Query checkout logs in logs-*'];

    await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE),
      submission: { evidence_gatherer_metadata: metadata },
    });

    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceGathererMetadata: metadata })
    );
  });

  it('does not mark a new tree reinforced just because it carries a taken path', async () => {
    const store = createStore();

    await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE.replace('-->|yes|', '-->|✅ yes|')),
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: false }));
  });

  it('marks an existing tree reinforced only when the submission adds a newly taken edge', async () => {
    const store = createStore(stored(FULL_TREE));

    await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE.replace('-->|yes|', '-->|✅ yes|')),
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: true }));
  });

  it('does not mark an existing tree reinforced when the taken edges already existed', async () => {
    const taken = FULL_TREE.replace('-->|yes|', '-->|✅ yes|');
    const store = createStore(stored(taken));

    await runSubmit({
      store,
      markdown: markdownFor(taken),
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: false }));
  });

  it('reports no changes when nothing was submitted', async () => {
    const store = createStore();
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: createSandboxStart('').getSandboxStart as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });

    const result = await tool.handler(
      { symptom_trees: [], traversals: [], summary: 'Tree already covers this run.' },
      createContext() as never
    );

    expect(store.commit).not.toHaveBeenCalled();
    expect('results' in result && result.results[0].data).toEqual(
      expect.objectContaining({ text: expect.stringContaining('No decision-tree changes') })
    );
  });

  it('attaches buffered learnings to existing trees when nothing was submitted', async () => {
    const store = createStore(stored(FULL_TREE));
    const buffered = [
      {
        kind: 'system' as const,
        tree_id: TREE_ID,
        category: 'architecture',
        content: 'Checkout writes through a pool.',
        keywords: [],
      },
    ];
    const peekLearnings = jest.fn().mockReturnValue(buffered);
    const drainLearnings = jest.fn().mockReturnValue([]);
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: createSandboxStart('').getSandboxStart as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      peekLearnings,
      drainLearnings,
      logger: loggerMock.create(),
    });

    const result = await tool.handler(
      { symptom_trees: [], traversals: [], summary: 'Learnings only.' },
      createContext() as never
    );

    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        treeId: TREE_ID,
        markdown: stored(FULL_TREE).markdown,
        reinforced: false,
        learnings: buffered,
        evidenceGathererMetadata: [],
      })
    );
    expect(drainLearnings).toHaveBeenCalledWith('default__conv-1');
    expect('results' in result && result.results[0].data).toEqual(
      expect.objectContaining({ text: expect.stringContaining('Attached learnings') })
    );
  });

  it('keeps buffered learnings when a submission is rejected, then drains them on success', async () => {
    const store = createStore(stored(FULL_TREE));
    const peekLearnings = jest.fn().mockReturnValue([
      {
        kind: 'system',
        tree_id: TREE_ID,
        category: 'architecture',
        content: 'Checkout writes through a pool.',
        keywords: [],
      },
    ]);
    const drainLearnings = jest.fn().mockReturnValue([]);
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: createSandboxStart(
        markdownFor('flowchart TD\n    S1([Checkout latency]) --> E1[Query logs]')
      ).getSandboxStart as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      peekLearnings,
      drainLearnings,
      logger: loggerMock.create(),
    });

    const rejected = await tool.handler(
      {
        symptom_trees: [
          {
            tree_id: TREE_ID,
            file_path: FILE_PATH,
            evidence_gatherer_metadata: [],
            merged_nodes: [],
          },
        ],
        traversals: [],
        summary: '',
      },
      createContext() as never
    );

    expect('results' in rejected && rejected.results[0].type).toBe(ToolResultType.error);
    expect(drainLearnings).not.toHaveBeenCalled();
    expect(store.commit).not.toHaveBeenCalled();

    const successTool = createSubmitOptimizerResultTool({
      getSandboxStart: createSandboxStart(markdownFor(FULL_TREE)).getSandboxStart as never,
      getStore: () => createStore(),
      getSpaceId: () => 'default',
      peekLearnings,
      drainLearnings,
      logger: loggerMock.create(),
    });

    await successTool.handler(
      {
        symptom_trees: [
          {
            tree_id: TREE_ID,
            file_path: FILE_PATH,
            evidence_gatherer_metadata: [],
            merged_nodes: [],
          },
        ],
        traversals: [],
        summary: 'Merged this run.',
      },
      createContext() as never
    );

    expect(drainLearnings).toHaveBeenCalledWith('default__conv-1');
  });

  describe('rejections', () => {
    const expectRejected = (result: unknown, reason: RegExp) => {
      const results = (result as { results: Array<{ type: string; data: { message: string } }> })
        .results;
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toMatch(reason);
    };

    it('rejects a tree id that is not symptom-prefixed', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: { tree_id: 'monitor_id:881680' },
      });

      expectRejected(result, /must be formatted symptom:<slug>/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a symptom slug outside the 2-5 word budget', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: {
          tree_id: 'symptom:checkout',
          file_path: 'decision-trees/decision_tree_checkout.md',
        },
      });

      expectRejected(result, /must be 2-5 words/);
    });

    it('rejects a file outside the decision-tree directory', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: { file_path: '/workspace/cortex/runbooks/checkout.md' },
      });

      expectRejected(result, /file_path for symptom:checkout-high-latency must be/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a submission that dropped most of the original nodes', async () => {
      const store = createStore(stored(FULL_TREE));

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(
          `flowchart TD\n    S9([Something else]) --> E9[New step]\n    E9 --> X9((New end))\n    E9 --> X8((Other end))\n    S9 --> E8[Another]\n    E8 --> X7((Third))`
        ),
      });

      expectRejected(result, /drops more than 30% of original nodes/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a submission that shrank below half the original', async () => {
      const store = createStore(stored(FULL_TREE));

      const { result } = await runSubmit({
        store,
        markdown: markdownFor('flowchart TD\n    S1([Checkout latency]) --> X1((Connection leak))'),
      });

      expectRejected(result, /less than 50% of original size/);
    });

    it('rejects evidence metadata that still carries a raw memory handle', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: { evidence_gatherer_metadata: ['E1: See MEM_4'] },
      });

      expectRejected(result, /must resolve raw memory references/);
    });

    it('rejects a tree that is only an evidence node', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor('flowchart TD\n    E1[Query logs]'),
      });

      expectRejected(result, /must include a symptom node, an end node, and at least one edge/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a file whose Mermaid cannot be found', async () => {
      const store = createStore();

      const { result } = await runSubmit({ store, markdown: '# Checkout\n\nNo diagram.\n' });

      expectRejected(result, /No Mermaid flowchart found/);
    });

    it('rejects a file the sandbox could not read', async () => {
      const store = createStore();
      const tool = createSubmitOptimizerResultTool({
        getSandboxStart: (() => ({
          getSession: () => ({
            readFiles: jest.fn().mockResolvedValue([{ success: false }]),
          }),
        })) as never,
        getStore: () => store,
        getSpaceId: () => 'default',
        logger: loggerMock.create(),
      });

      const result = await tool.handler(
        {
          symptom_trees: [
            {
              tree_id: TREE_ID,
              file_path: FILE_PATH,
              evidence_gatherer_metadata: [],
              merged_nodes: [],
            },
          ],
          traversals: [],
          summary: '',
        },
        createContext() as never
      );

      expectRejected(result, /Could not read submitted file/);
    });
  });
});

describe('nightshift_submit_optimizer_result counts', () => {
  const MAIN_PATH: EdgeRef[] = [
    { source_node_id: 'S1', target_node_id: 'E1' },
    { source_node_id: 'E1', target_node_id: 'D1' },
    { source_node_id: 'D1', target_node_id: 'E2' },
    { source_node_id: 'E2', target_node_id: 'X1' },
  ];
  const CAUSAL_TREE = FULL_TREE.replace(
    'S1([Checkout latency]) -->',
    'S1([Checkout latency]) -->|✅|'
  )
    .replace('E1 --> D1', 'E1 -->|✅| D1')
    .replace('-->|yes|', '-->|✅ yes|')
    .replace('E2 --> X1', 'E2 -->|✅| X1');
  const traversal = (overrides: Partial<Traversal> = {}): Traversal => ({
    tree_id: TREE_ID,
    visited_path: MAIN_PATH,
    causal_path: [],
    ...overrides,
  });
  const fullTree = parseMermaidDecisionTree(FULL_TREE, TREE_ID);

  /** Runs the counts update the tool handed to the store against the stored tree. */
  const committedCounts = (store: jest.Mocked<DecisionTreeStore>, previous = stored(FULL_TREE)) => {
    const [[{ updateCounts }]] = store.commit.mock.calls;
    return updateCounts({
      tree: parseMermaidDecisionTree(previous.mermaid, TREE_ID),
      counts: previous.counts,
    });
  };
  const nodeVisits = (counts: { nodes: Array<{ node_id: string; visit_count: number }> }) =>
    Object.fromEntries(counts.nodes.map((node) => [node.node_id, node.visit_count]));

  it('records a visit along visited_path on the edited tree', async () => {
    const store = createStore(stored(FULL_TREE));

    const { result } = await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE),
      traversals: [traversal()],
    });

    expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: false }));
    expect(nodeVisits(committedCounts(store))).toEqual({
      S1: 1,
      E1: 1,
      D1: 1,
      E2: 1,
      E3: 0,
      X1: 1,
      X2: 0,
    });
  });

  it('carries stored counts across an edit, summing merged nodes', async () => {
    const previous = stored(FULL_TREE);
    previous.counts = countsForTree(fullTree, {
      nodes: [
        { node_id: 'E2', visit_count: 2, reinforced_count: 0 },
        { node_id: 'E3', visit_count: 3, reinforced_count: 0 },
      ],
      edges: [],
    });
    const store = createStore(previous);
    const merged = FULL_TREE.replace('D1 -->|no| E3[Profile queries]', 'D1 -->|no| E2').replace(
      'E3 --> X2((Slow query))',
      'E2 --> X2((Slow query))'
    );

    await runSubmit({
      store,
      markdown: markdownFor(merged),
      submission: { merged_nodes: [{ from: ['E3'], into: 'E2' }] },
    });

    expect(nodeVisits(committedCounts(store, previous)).E2).toBe(5);
  });

  it('reinforces the causal path even when its ✅ marks already existed', async () => {
    const store = createStore(stored(CAUSAL_TREE));

    await runSubmit({
      store,
      markdown: markdownFor(CAUSAL_TREE),
      traversals: [traversal({ causal_path: MAIN_PATH })],
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: true }));
    const counts = committedCounts(store, stored(CAUSAL_TREE));
    expect(counts.nodes.find((node) => node.node_id === 'X1')).toMatchObject({
      visit_count: 1,
      reinforced_count: 1,
    });
    expect(counts.nodes.find((node) => node.node_id === 'X2')).toMatchObject({
      reinforced_count: 0,
    });
  });

  it('takes reinforcement from the traversal rather than from newly added ✅ edges', async () => {
    const store = createStore(stored(FULL_TREE));

    await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE.replace('-->|yes|', '-->|✅ yes|')),
      traversals: [traversal()],
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: false }));
  });

  it.each<
    [
      string,
      {
        existing?: boolean;
        traversals?: Traversal[];
        submission?: { merged_nodes: Array<{ from: string[]; into: string }> };
      },
      RegExp
    ]
  >([
    [
      'a causal_path edge without ✅',
      { traversals: [traversal({ causal_path: MAIN_PATH })] },
      /Mark every causal_path edge with ✅/,
    ],
    [
      'a visited edge the tree does not have',
      {
        traversals: [traversal({ visited_path: [{ source_node_id: 'S1', target_node_id: 'X2' }] })],
      },
      /has no edge S1 --> X2/,
    ],
    [
      'merged_nodes on a new tree',
      { submission: { merged_nodes: [{ from: ['E3'], into: 'E2' }] }, existing: false },
      /merged_nodes only applies to an existing tree/,
    ],
    [
      'two traversals of one tree',
      { traversals: [traversal(), traversal()] },
      /at most one traversal per tree/,
    ],
  ])('rejects %s without committing', async (_, { existing = true, ...input }, message) => {
    const store = createStore(existing ? stored(FULL_TREE) : undefined);

    const { result } = await runSubmit({ store, markdown: markdownFor(FULL_TREE), ...input });

    expect('results' in result && result.results[0]).toEqual(
      expect.objectContaining({
        type: ToolResultType.error,
        data: { message: expect.stringMatching(message) },
      })
    );
    expect(store.commit).not.toHaveBeenCalled();
  });

  it('does not count a traversal twice when the agent resubmits after a partial rejection', async () => {
    const otherTreeId = 'symptom:checkout-errors';
    const store = createStore(stored(FULL_TREE));
    const readFiles = jest
      .fn()
      .mockResolvedValueOnce([
        {
          success: true,
          content: Buffer.from(markdownFor('flowchart TD\n    S1([Checkout latency]) --> E1[Q]')),
        },
      ])
      .mockResolvedValue([{ success: true, content: Buffer.from(markdownFor(FULL_TREE)) }]);
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: (() => ({ getSession: () => ({ readFiles }) })) as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });
    const params = {
      symptom_trees: [
        {
          tree_id: TREE_ID,
          file_path: FILE_PATH,
          evidence_gatherer_metadata: [],
          merged_nodes: [],
        },
      ],
      traversals: [traversal({ tree_id: otherTreeId })],
      summary: '',
    };

    const first = await tool.handler(params, createContext() as never);
    const second = await tool.handler(params, createContext() as never);

    expect('results' in first && first.results[0].type).toBe(ToolResultType.error);
    expect('results' in second && second.results[0].type).toBe(ToolResultType.other);
    expect(store.updateCounts).toHaveBeenCalledTimes(1);
    expect(store.commit).toHaveBeenCalledTimes(1);
  });

  it('counts a traversal added on the retry of an edit that had none', async () => {
    const store = createStore(stored(FULL_TREE));
    const readFiles = jest
      .fn()
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(FULL_TREE)) }])
      .mockResolvedValueOnce([{ success: false, content: Buffer.from('') }])
      .mockResolvedValue([{ success: true, content: Buffer.from(markdownFor(FULL_TREE)) }]);
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: (() => ({ getSession: () => ({ readFiles }) })) as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });
    const otherTreeId = 'symptom:checkout-errors';
    const otherPath = 'decision-trees/decision_tree_checkout-errors.md';

    const first = await tool.handler(
      {
        symptom_trees: [
          {
            tree_id: TREE_ID,
            file_path: FILE_PATH,
            evidence_gatherer_metadata: [],
            merged_nodes: [],
          },
          {
            tree_id: otherTreeId,
            file_path: otherPath,
            evidence_gatherer_metadata: [],
            merged_nodes: [],
          },
        ],
        traversals: [],
        summary: '',
      },
      createContext() as never
    );
    const second = await tool.handler(
      {
        symptom_trees: [
          {
            tree_id: TREE_ID,
            file_path: FILE_PATH,
            evidence_gatherer_metadata: [],
            merged_nodes: [],
          },
          {
            tree_id: otherTreeId,
            file_path: otherPath,
            evidence_gatherer_metadata: [],
            merged_nodes: [],
          },
        ],
        traversals: [traversal()],
        summary: '',
      },
      createContext() as never
    );

    expect('results' in first && first.results[0].type).toBe(ToolResultType.error);
    expect('results' in second && second.results[0].type).toBe(ToolResultType.other);
    expect(store.commit).toHaveBeenCalledTimes(2);
    expect(store.updateCounts).toHaveBeenCalledTimes(1);
    const [[{ update }]] = store.updateCounts.mock.calls;
    expect(nodeVisits(update({ tree: fullTree, counts: countsForTree(fullTree) })).X1).toBe(1);
  });

  it('does not replay a merge that was already saved when another tree is retried', async () => {
    const otherTreeId = 'symptom:checkout-errors';
    const otherPath = 'decision-trees/decision_tree_checkout-errors.md';
    const merged = FULL_TREE.replace('D1 -->|no| E3[Profile queries]', 'D1 -->|no| E2').replace(
      'E3 --> X2((Slow query))',
      'E2 --> X2((Slow query))'
    );
    const store = createStore(stored(FULL_TREE));
    store.get.mockImplementation(async (treeId: string) =>
      treeId === TREE_ID
        ? stored(store.commit.mock.calls.length > 0 ? merged : FULL_TREE)
        : undefined
    );
    const readFiles = jest
      .fn()
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(merged)) }])
      .mockResolvedValueOnce([{ success: false, content: Buffer.from('') }])
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(merged)) }])
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(FULL_TREE)) }]);
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: (() => ({ getSession: () => ({ readFiles }) })) as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });
    const submission = {
      tree_id: TREE_ID,
      file_path: FILE_PATH,
      evidence_gatherer_metadata: [] as string[],
      merged_nodes: [{ from: ['E3'], into: 'E2' }],
    };
    const other = {
      tree_id: otherTreeId,
      file_path: otherPath,
      evidence_gatherer_metadata: [] as string[],
      merged_nodes: [] as Array<{ from: string[]; into: string }>,
    };

    const first = await tool.handler(
      { symptom_trees: [submission, other], traversals: [], summary: '' },
      createContext() as never
    );
    const second = await tool.handler(
      { symptom_trees: [submission, other], traversals: [], summary: '' },
      createContext() as never
    );

    expect('results' in first && first.results[0].type).toBe(ToolResultType.error);
    expect('results' in second && second.results[0].type).toBe(ToolResultType.other);
    expect(store.commit.mock.calls.map(([input]) => input.treeId)).toEqual([TREE_ID, otherTreeId]);
  });

  it('saves check marks added on the retry of an edit that was already stored', async () => {
    const otherTreeId = 'symptom:checkout-errors';
    const otherPath = 'decision-trees/decision_tree_checkout-errors.md';
    const merged = FULL_TREE.replace('D1 -->|no| E3[Profile queries]', 'D1 -->|no| E2').replace(
      'E3 --> X2((Slow query))',
      'E2 --> X2((Slow query))'
    );
    const marked = merged
      .replace('S1([Checkout latency]) -->', 'S1([Checkout latency]) -->|✅|')
      .replace('E1 --> D1', 'E1 -->|✅| D1')
      .replace('-->|yes|', '-->|✅ yes|')
      .replace('E2 --> X1', 'E2 -->|✅| X1');
    const store = createStore();
    store.get.mockImplementation(async (treeId: string) =>
      treeId === TREE_ID
        ? stored(store.commit.mock.calls.length > 0 ? merged : FULL_TREE)
        : undefined
    );
    const readFiles = jest
      .fn()
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(merged)) }])
      .mockResolvedValueOnce([{ success: false, content: Buffer.from('') }])
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(marked)) }])
      .mockResolvedValueOnce([{ success: true, content: Buffer.from(markdownFor(marked)) }])
      .mockResolvedValue([{ success: true, content: Buffer.from(markdownFor(FULL_TREE)) }]);
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: (() => ({ getSession: () => ({ readFiles }) })) as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });
    const submission = {
      tree_id: TREE_ID,
      file_path: FILE_PATH,
      evidence_gatherer_metadata: [] as string[],
      merged_nodes: [{ from: ['E3'], into: 'E2' }],
    };
    const other = {
      tree_id: otherTreeId,
      file_path: otherPath,
      evidence_gatherer_metadata: [] as string[],
      merged_nodes: [] as Array<{ from: string[]; into: string }>,
    };

    const first = await tool.handler(
      { symptom_trees: [submission, other], traversals: [], summary: '' },
      createContext() as never
    );
    const path = MAIN_PATH.map((edge) =>
      edge.source_node_id === 'D1' ? { ...edge, condition: 'yes' } : edge
    );
    const second = await tool.handler(
      {
        symptom_trees: [submission, other],
        traversals: [traversal({ visited_path: path, causal_path: path })],
        summary: '',
      },
      createContext() as never
    );

    expect('results' in first && first.results[0].type).toBe(ToolResultType.error);
    expect('results' in second && second.results[0].type).toBe(ToolResultType.other);
    expect(store.commit.mock.calls.map(([input]) => input.treeId)).toEqual([
      TREE_ID,
      TREE_ID,
      otherTreeId,
    ]);
    expect(store.commit.mock.calls[1][0].markdown).toBe(markdownFor(marked));
    expect(store.updateCounts).not.toHaveBeenCalled();
  });

  it('keeps learnings for a tree that this submit does not edit or traverse', async () => {
    const otherTreeId = 'symptom:checkout-errors';
    const store = createStore(stored(FULL_TREE));
    const learning = {
      kind: 'system' as const,
      tree_id: otherTreeId,
      category: 'architecture',
      content: 'Errors come from the gateway.',
      keywords: [],
    };
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: createSandboxStart('').getSandboxStart as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      peekLearnings: () => [learning],
      drainLearnings: jest.fn(),
      logger: loggerMock.create(),
    });

    const result = await tool.handler(
      { symptom_trees: [], traversals: [traversal()], summary: 'Traversal plus a learning.' },
      createContext() as never
    );

    expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({ treeId: otherTreeId, learnings: [learning] })
    );
    expect(store.updateCounts).toHaveBeenCalledWith(expect.objectContaining({ treeId: TREE_ID }));
  });

  it('does not rewrite a tree whose version write failed after the head was saved', async () => {
    const store = createStore(stored(FULL_TREE));
    store.commit.mockRejectedValueOnce(new DecisionTreeVersionWriteError(TREE_ID));
    const tool = createSubmitOptimizerResultTool({
      getSandboxStart: createSandboxStart(markdownFor(FULL_TREE)).getSandboxStart as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });
    const params = {
      symptom_trees: [
        {
          tree_id: TREE_ID,
          file_path: FILE_PATH,
          evidence_gatherer_metadata: [],
          merged_nodes: [],
        },
      ],
      traversals: [],
      summary: '',
    };

    const first = await tool.handler(params, createContext() as never);
    const second = await tool.handler(params, createContext() as never);

    expect('results' in first && first.results[0].type).toBe(ToolResultType.error);
    expect('results' in second && second.results[0].type).toBe(ToolResultType.other);
    expect(store.commit).toHaveBeenCalledTimes(1);
  });

  describe('a traversal of a tree the agent did not edit', () => {
    it('updates only the head counts', async () => {
      const store = createStore(stored(FULL_TREE));

      const { result } = await runSubmit({
        store,
        markdown: '',
        edited: false,
        traversals: [traversal()],
      });

      expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
      expect(store.commit).not.toHaveBeenCalled();
      expect(store.updateCounts).toHaveBeenCalledWith(
        expect.objectContaining({ treeId: TREE_ID, reinforced: false })
      );
      const [[{ update }]] = store.updateCounts.mock.calls;
      expect(nodeVisits(update({ tree: fullTree, counts: countsForTree(fullTree) })).X1).toBe(1);
    });

    it('reinforces and promotes the tree when it names a causal path', async () => {
      const store = createStore(stored(CAUSAL_TREE));

      await runSubmit({
        store,
        markdown: '',
        edited: false,
        traversals: [traversal({ visited_path: [], causal_path: MAIN_PATH })],
      });

      expect(store.updateCounts).toHaveBeenCalledWith(
        expect.objectContaining({ reinforced: true })
      );
    });

    it('commits a version when the turn also recorded learnings for the tree', async () => {
      const store = createStore(stored(FULL_TREE));
      const tool = createSubmitOptimizerResultTool({
        getSandboxStart: createSandboxStart('').getSandboxStart as never,
        getStore: () => store,
        getSpaceId: () => 'default',
        peekLearnings: () => [
          {
            kind: 'system',
            tree_id: TREE_ID,
            category: 'architecture',
            content: 'Checkout writes through a pool.',
            keywords: [],
          },
        ],
        logger: loggerMock.create(),
      });

      await tool.handler(
        { symptom_trees: [], traversals: [traversal()], summary: '' },
        createContext() as never
      );

      expect(store.updateCounts).not.toHaveBeenCalled();
      expect(store.commit).toHaveBeenCalledWith(
        expect.objectContaining({ markdown: stored(FULL_TREE).markdown })
      );
      expect(nodeVisits(committedCounts(store)).X1).toBe(1);
    });

    it('rejects a traversal of a tree that does not exist', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: '',
        edited: false,
        traversals: [traversal()],
      });

      expect('results' in result && result.results[0].type).toBe(ToolResultType.error);
      expect(store.updateCounts).not.toHaveBeenCalled();
    });
  });
});
