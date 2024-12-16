/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import { getRunAttackDiscoveriesWithReplacements } from '.';
import { runWithReplacements } from '../../../__mocks__/mock_runs';

describe('getRunAttackDiscoveriesWithReplacements', () => {
  it('returns attack discoveries with replacements applied to the detailsMarkdown, entitySummaryMarkdown, summaryMarkdown, and title', () => {
    const result = getRunAttackDiscoveriesWithReplacements(runWithReplacements);

    expect(result).toEqual([
      {
        alertIds: [
          '4af5689eb58c2420efc0f7fad53c5bf9b8b6797e516d6ea87d6044ce25d54e16',
          'c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b',
          '021b27d6bee0650a843be1d511119a3b5c7c8fdaeff922471ce0248ad27bd26c',
          '6cc8d5f0e1c2b6c75219b001858f1be64194a97334be7a1e3572f8cfe6bae608',
          'f39a4013ed9609584a8a22dca902e896aa5b24d2da03e0eaab5556608fa682ac',
          '909968e926e08a974c7df1613d98ebf1e2422afcb58e4e994beb47b063e85080',
          '2c25a4dc31cd1ec254c2b19ea663fd0b09a16e239caa1218b4598801fb330da6',
          '3bf907becb3a4f8e39a3b673e0d50fc954a7febef30c12891744c603760e4998',
        ],
        detailsMarkdown:
          '- The attack began with the execution of a malicious file named `unix1` on the host `{{ host.name SRVMAC08 }}` by the user `{{ user.name james }}`.\n- The file `unix1` was detected at `{{ file.path /Users/james/unix1 }}` with a SHA256 hash of `{{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}`.\n- The process `{{ process.name My Go Application.app }}` was executed multiple times with different arguments, indicating potential persistence mechanisms.\n- The process `{{ process.name chmod }}` was used to change permissions of the file `unix1` to 777, making it executable.\n- A phishing attempt was detected via `osascript` on the same host, attempting to capture user credentials.\n- The attack involved multiple critical alerts, all indicating high-risk malware activity.',
        entitySummaryMarkdown:
          'The host `{{ host.name SRVMAC08 }}` and user `{{ user.name james }}` were involved in the attack.',
        mitreAttackTactics: ['Initial Access', 'Execution', 'Persistence', 'Credential Access'],
        summaryMarkdown:
          'A series of critical malware alerts were detected on the host `{{ host.name SRVMAC08 }}` involving the user `{{ user.name james }}`. The attack included the execution of a malicious file `unix1`, permission changes, and a phishing attempt via `osascript`.',
        title: 'Critical Malware Attack on macOS Host',
        timestamp: '2024-10-11T17:55:59.702Z',
      },
    ]);
  });

  it("returns an empty entitySummaryMarkdown when it's missing from the attack discovery", () => {
    const missingEntitySummaryMarkdown = omit(
      'entitySummaryMarkdown',
      runWithReplacements.outputs?.attackDiscoveries?.[0]
    );

    const runWithMissingEntitySummaryMarkdown = {
      ...runWithReplacements,
      outputs: {
        ...runWithReplacements.outputs,
        attackDiscoveries: [missingEntitySummaryMarkdown],
      },
    };

    const result = getRunAttackDiscoveriesWithReplacements(runWithMissingEntitySummaryMarkdown);

    expect(result).toEqual([
      {
        alertIds: [
          '4af5689eb58c2420efc0f7fad53c5bf9b8b6797e516d6ea87d6044ce25d54e16',
          'c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b',
          '021b27d6bee0650a843be1d511119a3b5c7c8fdaeff922471ce0248ad27bd26c',
          '6cc8d5f0e1c2b6c75219b001858f1be64194a97334be7a1e3572f8cfe6bae608',
          'f39a4013ed9609584a8a22dca902e896aa5b24d2da03e0eaab5556608fa682ac',
          '909968e926e08a974c7df1613d98ebf1e2422afcb58e4e994beb47b063e85080',
          '2c25a4dc31cd1ec254c2b19ea663fd0b09a16e239caa1218b4598801fb330da6',
          '3bf907becb3a4f8e39a3b673e0d50fc954a7febef30c12891744c603760e4998',
        ],
        detailsMarkdown:
          '- The attack began with the execution of a malicious file named `unix1` on the host `{{ host.name SRVMAC08 }}` by the user `{{ user.name james }}`.\n- The file `unix1` was detected at `{{ file.path /Users/james/unix1 }}` with a SHA256 hash of `{{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}`.\n- The process `{{ process.name My Go Application.app }}` was executed multiple times with different arguments, indicating potential persistence mechanisms.\n- The process `{{ process.name chmod }}` was used to change permissions of the file `unix1` to 777, making it executable.\n- A phishing attempt was detected via `osascript` on the same host, attempting to capture user credentials.\n- The attack involved multiple critical alerts, all indicating high-risk malware activity.',
        entitySummaryMarkdown: '',
        mitreAttackTactics: ['Initial Access', 'Execution', 'Persistence', 'Credential Access'],
        summaryMarkdown:
          'A series of critical malware alerts were detected on the host `{{ host.name SRVMAC08 }}` involving the user `{{ user.name james }}`. The attack included the execution of a malicious file `unix1`, permission changes, and a phishing attempt via `osascript`.',
        title: 'Critical Malware Attack on macOS Host',
        timestamp: '2024-10-11T17:55:59.702Z',
      },
    ]);
  });

  it('throws when the run is missing attackDiscoveries', () => {
    const missingAttackDiscoveries = {
      ...runWithReplacements,
      outputs: {
        replacements: { ...runWithReplacements.outputs?.replacements },
      },
    };

    expect(() => getRunAttackDiscoveriesWithReplacements(missingAttackDiscoveries)).toThrowError();
  });

  it('throws when attackDiscoveries is null', () => {
    const nullAttackDiscoveries = {
      ...runWithReplacements,
      outputs: {
        attackDiscoveries: null,
        replacements: { ...runWithReplacements.outputs?.replacements },
      },
    };

    expect(() => getRunAttackDiscoveriesWithReplacements(nullAttackDiscoveries)).toThrowError();
  });

  it('returns the original attack discoveries when replacements are missing', () => {
    const missingReplacements = {
      ...runWithReplacements,
      outputs: {
        attackDiscoveries: [...runWithReplacements.outputs?.attackDiscoveries],
      },
    };

    const result = getRunAttackDiscoveriesWithReplacements(missingReplacements);

    expect(result).toEqual(runWithReplacements.outputs?.attackDiscoveries);
  });
});
