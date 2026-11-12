/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { countsForTree, parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import type { LearningRecord } from '@kbn/nightshift-decision-trees';
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
    listTreeIdsForInvestigation: jest.fn().mockResolvedValue([]),
    updateCounts: jest.fn().mockResolvedValue(stored(FULL_TREE)),
    listVersions: jest.fn().mockResolvedValue([]),
    getVersion: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn(),
    writePendingVersion: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<DecisionTreeStore>);

/** The error a commit throws when its head was saved but its version document was not. */
const versionWriteError = (
  head: DecisionTreeDetail = { ...stored(FULL_TREE), version: 2 },
  treeId = TREE_ID
) =>
  new DecisionTreeVersionWriteError({
    treeId,
    version: head.version,
    document: {
      '@timestamp': '2026-09-09T12:00:00.000Z',
      type: 'decision_tree_version',
      title: `Checkout High Latency v${head.version}`,
      content: head.markdown,
      tags: [],
      learnings: [],
    },
    head,
  });

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

const createContext = (conversationId = 'conv-1') => ({
  request: {} as never,
  runContext: { stack: [{ type: 'agent', conversationId }] },
  callContext: {
    toolId: 'nightshift_submit_optimizer_result',
    toolCallId: 'call-1',
    callSource: 'agent',
  },
  esClient: { asCurrentUser: {} },
  agentConfiguration: { connector_ids: [] },
});

type PathStep = string | { id: string; condition?: string };

interface Traversal {
  tree_id: string;
  visited_path: PathStep[];
  causal_path: PathStep[];
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

    // The commit keeps the content of the head it re-reads rather than an earlier snapshot.
    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        treeId: TREE_ID,
        keepHeadContent: true,
        reinforced: false,
        learnings: buffered,
      })
    );
    expect(store.commit).toHaveBeenCalledWith(
      expect.not.objectContaining({ markdown: expect.anything() })
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
        submission: { file_path: '/workspace/wiki/runbooks/checkout.md' },
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
  const MAIN_PATH: PathStep[] = ['S1', 'E1', 'D1', 'E2', 'X1'];
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

  it('does not promote a tree created in the same submit as its causal path', async () => {
    const store = createStore();

    await runSubmit({
      store,
      markdown: markdownFor(CAUSAL_TREE),
      traversals: [traversal({ causal_path: MAIN_PATH })],
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: false }));
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
        traversals: [traversal({ visited_path: ['S1', 'X2'] })],
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
    const path: PathStep[] = ['S1', 'E1', 'D1', { id: 'E2', condition: 'yes' }, 'X1'];
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
    expect(store.commit.mock.calls[1][0]).toEqual(
      expect.objectContaining({ markdown: markdownFor(marked) })
    );
    expect(store.updateCounts).not.toHaveBeenCalled();
  });

  it('keeps learnings for a tree that this submit does not edit or traverse', async () => {
    const otherTreeId = 'symptom:checkout-errors';
    const store = createStore(stored(FULL_TREE));
    const learning: LearningRecord = {
      kind: 'system',
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
    const error = versionWriteError();
    store.commit.mockRejectedValueOnce(error);
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
    expect(store.writePendingVersion).not.toHaveBeenCalled();
    const second = await tool.handler(params, createContext() as never);

    expect('results' in first && first.results[0].type).toBe(ToolResultType.error);
    expect('results' in second && second.results[0].type).toBe(ToolResultType.other);
    expect(store.commit).toHaveBeenCalledTimes(1);
    expect(store.writePendingVersion).toHaveBeenCalledTimes(1);
    expect(store.writePendingVersion).toHaveBeenCalledWith(error.pending);
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
        expect.objectContaining({ treeId: TREE_ID, keepHeadContent: true })
      );
      expect(store.commit).toHaveBeenCalledWith(
        expect.not.objectContaining({ markdown: expect.anything() })
      );
      expect(nodeVisits(committedCounts(store)).X1).toBe(1);
    });

    it('rejects the traversal when the tree disappears before its counts are written', async () => {
      const store = createStore(stored(FULL_TREE));
      store.updateCounts.mockResolvedValue(undefined);

      const { result } = await runSubmit({
        store,
        markdown: '',
        edited: false,
        traversals: [traversal()],
      });

      expect('results' in result && result.results[0]).toEqual(
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: expect.stringContaining(`${TREE_ID} no longer exists`) },
        })
      );
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

  describe('retries of a partially rejected submit', () => {
    const OTHER_TREE_ID = 'symptom:checkout-errors';
    const OTHER_ABSOLUTE_PATH = '/workspace/decision-trees/decision_tree_checkout-errors.md';
    const mainSubmission = (
      overrides: Partial<{
        evidence_gatherer_metadata: string[];
        merged_nodes: Array<{ from: string[]; into: string }>;
      }> = {}
    ) => ({
      tree_id: TREE_ID,
      file_path: FILE_PATH,
      evidence_gatherer_metadata: [] as string[],
      merged_nodes: [] as Array<{ from: string[]; into: string }>,
      ...overrides,
    });
    /** The other tree's file is unreadable until a test writes it, so it is rejected. */
    const otherSubmission = {
      tree_id: OTHER_TREE_ID,
      file_path: 'decision-trees/decision_tree_checkout-errors.md',
      evidence_gatherer_metadata: [] as string[],
      merged_nodes: [] as Array<{ from: string[]; into: string }>,
    };
    const learningFor = (
      treeId: string,
      content = 'Checkout writes through a pool.'
    ): LearningRecord => ({
      kind: 'system',
      tree_id: treeId,
      category: 'architecture',
      content,
      keywords: [],
    });

    /** Builds the tool over a sandbox whose files are looked up by absolute path at read time. */
    const createTool = ({
      store,
      files = {},
      ...options
    }: {
      store: jest.Mocked<DecisionTreeStore>;
      files?: Record<string, string>;
    } & Partial<Parameters<typeof createSubmitOptimizerResultTool>[0]>) => {
      const readFiles = jest.fn(async ([{ path }]: Array<{ path: string }>) => {
        const content = files[path];
        return [
          content === undefined
            ? { success: false }
            : { success: true, content: Buffer.from(content) },
        ];
      });
      const tool = createSubmitOptimizerResultTool({
        getSandboxStart: (() => ({ getSession: () => ({ readFiles }) })) as never,
        getStore: () => store,
        getSpaceId: () => 'default',
        logger: loggerMock.create(),
        ...options,
      });
      const submit = (
        params: Partial<{
          symptom_trees: Array<ReturnType<typeof mainSubmission>>;
          traversals: Traversal[];
        }>,
        conversationId?: string
      ) =>
        tool.handler(
          { symptom_trees: [], traversals: [], summary: 'Retry.', ...params },
          createContext(conversationId) as never
        );
      return { submit, files };
    };

    const resultOf = (result: unknown) =>
      (result as { results: Array<{ type: string; data: { message?: string } }> }).results[0];
    const commitsFor = (store: jest.Mocked<DecisionTreeStore>, treeId: string) =>
      store.commit.mock.calls.filter(([input]) => input.treeId === treeId).map(([input]) => input);
    const updateCountsFor = (store: jest.Mocked<DecisionTreeStore>, treeId: string) =>
      store.updateCounts.mock.calls.filter(([input]) => input.treeId === treeId);
    const provenanceFields = {
      conversationId: 'inv-1',
      roundId: 'round-1',
      workflowExecutionId: 'wf-1',
    };
    const getProvenance = () => provenanceFields;

    it('keeps a tree created by an earlier attempt of the turn tentative on the retry', async () => {
      const store = createStore();
      store.get.mockResolvedValueOnce(undefined).mockResolvedValue(stored(CAUSAL_TREE));
      const { submit } = createTool({
        store,
        files: { [ABSOLUTE_PATH]: markdownFor(CAUSAL_TREE) },
      });

      // The new tree is created while the other tree is rejected, so the agent retries both.
      await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
      await submit({
        symptom_trees: [mainSubmission(), otherSubmission],
        traversals: [traversal({ causal_path: MAIN_PATH })],
      });

      expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: false }));
      expect(store.updateCounts).toHaveBeenCalledWith(
        expect.objectContaining({ treeId: TREE_ID, reinforced: false })
      );
      expect(store.updateCounts).not.toHaveBeenCalledWith(
        expect.objectContaining({ reinforced: true })
      );
    });

    it('rejects a submit that lists one tree twice without committing either entry', async () => {
      const store = createStore(stored(FULL_TREE));
      const { submit } = createTool({
        store,
        files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
      });

      const result = await submit({
        symptom_trees: [
          mainSubmission({ evidence_gatherer_metadata: ['E1: Checkout latency from APM'] }),
          mainSubmission(),
        ],
      });

      expect(resultOf(result)).toEqual(
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: expect.stringMatching(/Submit each tree once in symptom_trees/) },
        })
      );
      expect(store.commit).not.toHaveBeenCalled();
    });

    describe('provenance and applied writes', () => {
      it('records both for learnings on a tree the submit neither edits nor traverses', async () => {
        const store = createStore(stored(FULL_TREE));
        const onAppliedWrite = jest.fn();
        const { submit } = createTool({
          store,
          peekLearnings: () => [learningFor(OTHER_TREE_ID)],
          getProvenance,
          onAppliedWrite,
        });

        const result = await submit({ traversals: [traversal()] });

        expect(resultOf(result).type).toBe(ToolResultType.other);
        expect(commitsFor(store, OTHER_TREE_ID)).toEqual([
          expect.objectContaining(provenanceFields),
        ]);
        expect(onAppliedWrite).toHaveBeenCalledWith(
          'default__conv-1',
          expect.objectContaining({ item_id: OTHER_TREE_ID, action: 'attach_learnings' })
        );
      });

      it('names the investigation on a counts-only traversal of an unedited tree', async () => {
        const store = createStore(stored(FULL_TREE));
        const { submit } = createTool({ store, getProvenance });

        await submit({ traversals: [traversal()] });

        expect(updateCountsFor(store, TREE_ID)).toEqual([
          [expect.objectContaining({ conversationId: provenanceFields.conversationId })],
        ]);
      });

      it('records the applied write of a traversal added on the retry of a saved edit', async () => {
        const store = createStore(stored(FULL_TREE));
        const onAppliedWrite = jest.fn();
        const { submit } = createTool({
          store,
          files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
          getProvenance,
          onAppliedWrite,
        });

        await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
        await submit({
          symptom_trees: [mainSubmission(), otherSubmission],
          traversals: [traversal()],
        });

        expect(updateCountsFor(store, TREE_ID)).toHaveLength(1);
        const writes = onAppliedWrite.mock.calls
          .map(([, write]) => write)
          .filter((write) => write.item_id === TREE_ID);
        expect(writes).toEqual([
          expect.objectContaining({ action: 'update' }),
          expect.objectContaining({ action: 'update', version: 1 }),
        ]);
      });

      it('stamps provenance on the learnings commit of a traversal added on the retry of a saved edit', async () => {
        const store = createStore(stored(FULL_TREE));
        const onAppliedWrite = jest.fn();
        const learning = learningFor(TREE_ID);
        const { submit } = createTool({
          store,
          files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
          peekLearnings: jest.fn().mockReturnValueOnce([]).mockReturnValue([learning]),
          getProvenance,
          onAppliedWrite,
        });

        await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
        await submit({
          symptom_trees: [mainSubmission(), otherSubmission],
          traversals: [traversal()],
        });

        const [, retried] = commitsFor(store, TREE_ID);
        expect(retried).toEqual(
          expect.objectContaining({
            ...provenanceFields,
            keepHeadContent: true,
            learnings: [learning],
          })
        );
        expect(
          onAppliedWrite.mock.calls.filter(([, write]) => write.item_id === TREE_ID)
        ).toHaveLength(2);
      });
    });

    describe('writes without structural edits', () => {
      it('checks the causal path against the head the learnings commit re-reads', async () => {
        const store = createStore(stored(CAUSAL_TREE));
        const { submit } = createTool({ store, peekLearnings: () => [learningFor(TREE_ID)] });

        await submit({ traversals: [traversal({ causal_path: MAIN_PATH })] });

        const [input] = commitsFor(store, TREE_ID);
        expect(input).toEqual(expect.objectContaining({ keepHeadContent: true }));
        expect('markdown' in input).toBe(false);
        expect(() =>
          input.updateCounts({ tree: fullTree, counts: countsForTree(fullTree) })
        ).toThrow(/Mark every causal_path edge with ✅/);
      });

      it('checks the causal path against the head a counts-only update re-reads', async () => {
        const store = createStore(stored(CAUSAL_TREE));
        const { submit } = createTool({ store });

        await submit({ traversals: [traversal({ causal_path: MAIN_PATH })] });

        const [[{ update }]] = store.updateCounts.mock.calls;
        expect(() => update({ tree: fullTree, counts: countsForTree(fullTree) })).toThrow(
          /Mark every causal_path edge with ✅/
        );
      });

      it('reports the markdown of the head the commit wrote as the applied content', async () => {
        const store = createStore(stored(CAUSAL_TREE));
        const newerHead = { ...stored(CAUSAL_TREE), markdown: markdownFor(FULL_TREE), version: 3 };
        store.commit.mockResolvedValue(newerHead);
        const onAppliedWrite = jest.fn();
        const { submit } = createTool({
          store,
          peekLearnings: () => [learningFor(TREE_ID)],
          onAppliedWrite,
        });

        await submit({ traversals: [traversal({ causal_path: MAIN_PATH })] });

        expect(onAppliedWrite).toHaveBeenCalledWith(
          'default__conv-1',
          expect.objectContaining({
            item_id: TREE_ID,
            version: 3,
            before_content: stored(CAUSAL_TREE).markdown,
            after_content: newerHead.markdown,
          })
        );
      });
    });

    describe('learnings', () => {
      it('does not attach the learnings of an untouched tree again on the retry', async () => {
        const store = createStore(stored(FULL_TREE));
        const { submit } = createTool({ store, peekLearnings: () => [learningFor(TREE_ID)] });

        const first = await submit({ symptom_trees: [otherSubmission] });
        const second = await submit({ symptom_trees: [otherSubmission] });

        expect(resultOf(first).type).toBe(ToolResultType.error);
        expect(resultOf(second).type).toBe(ToolResultType.error);
        expect(commitsFor(store, TREE_ID)).toHaveLength(1);
      });

      // The store keeps one learning per slot, so the head must end on the turn's latest value
      // even when that value was already written once and then replaced.
      it('writes a learning again when a later retry replaced it in its slot', async () => {
        const store = createStore(stored(FULL_TREE));
        const first = learningFor(TREE_ID, 'Checkout writes through a pool.');
        const second = learningFor(TREE_ID, 'Checkout writes through a queue.');
        const { submit } = createTool({
          store,
          peekLearnings: jest
            .fn()
            .mockReturnValueOnce([first])
            .mockReturnValueOnce([first, second])
            .mockReturnValue([first, second, first]),
        });

        await submit({ symptom_trees: [otherSubmission] });
        await submit({ symptom_trees: [otherSubmission] });
        await submit({ symptom_trees: [otherSubmission] });

        expect(commitsFor(store, TREE_ID)).toEqual([
          expect.objectContaining({ learnings: [first] }),
          expect.objectContaining({ learnings: [second] }),
          expect.objectContaining({ learnings: [first] }),
        ]);
      });

      it('writes only the latest learning per slot and not again once the head holds it', async () => {
        const store = createStore(stored(FULL_TREE));
        const first = learningFor(TREE_ID, 'Checkout writes through a pool.');
        const second = learningFor(TREE_ID, 'Checkout writes through a queue.');
        const { submit } = createTool({ store, peekLearnings: () => [first, second] });

        await submit({ symptom_trees: [otherSubmission] });
        await submit({ symptom_trees: [otherSubmission] });

        expect(commitsFor(store, TREE_ID)).toEqual([
          expect.objectContaining({ learnings: [second] }),
        ]);
      });

      it('attaches a learning recorded after the edit of its tree was saved', async () => {
        const store = createStore(stored(FULL_TREE));
        const learning = learningFor(TREE_ID);
        const { submit } = createTool({
          store,
          files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
          peekLearnings: jest.fn().mockReturnValueOnce([]).mockReturnValue([learning]),
        });

        await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
        await submit({ symptom_trees: [mainSubmission(), otherSubmission] });

        expect(commitsFor(store, TREE_ID)).toEqual([
          expect.objectContaining({ learnings: [] }),
          expect.objectContaining({ keepHeadContent: true, learnings: [learning] }),
        ]);
      });

      it('holds the learnings of a rejected tree until its edit is saved', async () => {
        const store = createStore(stored(FULL_TREE));
        const learning = learningFor(OTHER_TREE_ID);
        const { submit, files } = createTool({
          store,
          files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
          peekLearnings: () => [learning],
        });

        const first = await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
        expect(resultOf(first).type).toBe(ToolResultType.error);
        expect(commitsFor(store, OTHER_TREE_ID)).toEqual([]);

        files[OTHER_ABSOLUTE_PATH] = markdownFor(FULL_TREE);
        const second = await submit({ symptom_trees: [mainSubmission(), otherSubmission] });

        expect(resultOf(second).type).toBe(ToolResultType.other);
        expect(commitsFor(store, OTHER_TREE_ID)).toEqual([
          expect.objectContaining({ markdown: markdownFor(FULL_TREE), learnings: [learning] }),
        ]);
      });

      it('does not attach a learning again after its commit saved the head but not the version', async () => {
        const store = createStore(stored(FULL_TREE));
        store.commit.mockRejectedValueOnce(versionWriteError());
        const { submit } = createTool({ store, peekLearnings: () => [learningFor(TREE_ID)] });

        const first = await submit({});
        const second = await submit({});

        expect(resultOf(first).type).toBe(ToolResultType.error);
        expect(resultOf(second).type).toBe(ToolResultType.other);
        expect(store.writePendingVersion).toHaveBeenCalledTimes(1);
        expect(commitsFor(store, TREE_ID)).toHaveLength(1);
      });
    });

    describe('a version write that failed after the head was saved', () => {
      it('reports the saved head, then writes the owed version on the retry', async () => {
        const store = createStore(stored(FULL_TREE));
        const error = versionWriteError({ ...stored(CAUSAL_TREE), version: 2 });
        store.commit.mockRejectedValueOnce(error);
        const onAppliedWrite = jest.fn();
        const { submit } = createTool({
          store,
          files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
          onAppliedWrite,
        });

        const first = await submit({ symptom_trees: [mainSubmission()] });
        expect(resultOf(first).type).toBe(ToolResultType.error);
        expect(onAppliedWrite).toHaveBeenCalledWith(
          'default__conv-1',
          expect.objectContaining({
            item_id: TREE_ID,
            version: 2,
            after_content: error.pending.head.markdown,
          })
        );

        const second = await submit({ symptom_trees: [mainSubmission()] });

        expect(resultOf(second).type).toBe(ToolResultType.other);
        expect(store.writePendingVersion).toHaveBeenCalledWith(error.pending);
        expect(store.commit).toHaveBeenCalledTimes(1);
      });

      it('keeps the owed version and rejects the tree until it is written', async () => {
        const store = createStore(stored(FULL_TREE));
        const error = versionWriteError();
        store.commit.mockRejectedValueOnce(error);
        store.writePendingVersion.mockRejectedValueOnce(error);
        const { submit } = createTool({
          store,
          files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
        });

        await submit({ symptom_trees: [mainSubmission()] });
        const second = await submit({ symptom_trees: [mainSubmission()] });

        expect(resultOf(second)).toEqual({
          type: ToolResultType.error,
          data: { message: expect.stringContaining(`- ${TREE_ID}: ${error.message}`) },
        });

        const third = await submit({ symptom_trees: [mainSubmission()] });

        expect(resultOf(third).type).toBe(ToolResultType.other);
        expect(store.writePendingVersion).toHaveBeenCalledTimes(2);
        expect(store.commit).toHaveBeenCalledTimes(1);
      });
    });

    it('saves evidence metadata changed on the retry of a saved edit', async () => {
      const store = createStore(stored(FULL_TREE));
      const metadata = ['E1: Query checkout logs in logs-*'];
      const { submit } = createTool({ store, files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) } });

      await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
      await submit({
        symptom_trees: [mainSubmission({ evidence_gatherer_metadata: metadata }), otherSubmission],
      });

      expect(commitsFor(store, TREE_ID)).toEqual([
        expect.objectContaining({ evidenceGathererMetadata: [] }),
        expect.objectContaining({ evidenceGathererMetadata: metadata }),
      ]);
    });

    it.each([
      ['every from node is still on the head', ['E3']],
      ['some from nodes are no longer on the head', ['E3', 'X9']],
    ])('keeps a merge the saved edit did not apply when %s', async (_, from) => {
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
      const { submit, files } = createTool({
        store,
        files: { [ABSOLUTE_PATH]: markdownFor(FULL_TREE) },
      });

      await submit({ symptom_trees: [mainSubmission(), otherSubmission] });
      files[ABSOLUTE_PATH] = markdownFor(merged);
      const second = await submit({
        symptom_trees: [mainSubmission({ merged_nodes: [{ from, into: 'E2' }] }), otherSubmission],
      });

      expect(resultOf(second).data.message).not.toMatch(TREE_ID);
      const [, retried] = commitsFor(store, TREE_ID);
      const counts = retried.updateCounts({ tree: fullTree, counts: previous.counts });
      expect(nodeVisits(counts).E2).toBe(5);
    });

    it('reinforces a causal path added on the retry without counting the visit again', async () => {
      const store = createStore(stored(CAUSAL_TREE));
      const { submit } = createTool({ store });

      await submit({ symptom_trees: [otherSubmission], traversals: [traversal()] });
      await submit({
        symptom_trees: [otherSubmission],
        traversals: [traversal({ causal_path: MAIN_PATH })],
      });

      const calls = updateCountsFor(store, TREE_ID);
      expect(calls).toHaveLength(2);
      const [, [retried]] = calls;
      expect(retried.reinforced).toBe(true);
      const causalTree = parseMermaidDecisionTree(CAUSAL_TREE, TREE_ID);
      const counts = retried.update({ tree: causalTree, counts: countsForTree(causalTree) });
      expect(counts.nodes.find((node) => node.node_id === 'X1')).toMatchObject({
        visit_count: 0,
        reinforced_count: 1,
      });
    });

    describe('retry bookkeeping', () => {
      let nowMs: number;
      beforeEach(() => {
        nowMs = Date.parse('2026-11-05T10:00:00.000Z');
        jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
      });
      afterEach(() => {
        jest.restoreAllMocks();
      });

      const partialSubmit = { symptom_trees: [otherSubmission], traversals: [traversal()] };

      it('forgets a conversation that has not retried within an hour', async () => {
        const store = createStore(stored(FULL_TREE));
        const { submit } = createTool({ store });

        await submit(partialSubmit);
        nowMs += 60 * 60 * 1000 + 1;
        await submit({}, 'conv-2');
        await submit(partialSubmit);

        expect(updateCountsFor(store, TREE_ID)).toHaveLength(2);
      });

      it('forgets the stalest conversation once 500 others are waiting to retry', async () => {
        const store = createStore(stored(FULL_TREE));
        const { submit } = createTool({ store });

        await submit(partialSubmit);
        for (let index = 0; index < 500; index++) {
          await submit({ symptom_trees: [otherSubmission] }, `conv-other-${index}`);
        }
        await submit(partialSubmit);

        expect(updateCountsFor(store, TREE_ID)).toHaveLength(2);
      });

      it('remembers a conversation that retries within the hour and under the cap', async () => {
        const store = createStore(stored(FULL_TREE));
        const { submit } = createTool({ store });

        await submit(partialSubmit);
        nowMs += 59 * 60 * 1000;
        for (let index = 0; index < 10; index++) {
          await submit({ symptom_trees: [otherSubmission] }, `conv-other-${index}`);
        }
        await submit(partialSubmit);

        expect(updateCountsFor(store, TREE_ID)).toHaveLength(1);
      });
    });
  });
});
