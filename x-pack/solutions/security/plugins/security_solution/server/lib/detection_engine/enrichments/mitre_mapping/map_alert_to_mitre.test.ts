/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapAlertToMitre, mapAlertToMitreWithCache } from './map_alert_to_mitre';
import type { LLMClient } from './map_alert_to_mitre';

describe('mapAlertToMitre', () => {
  let mockLLM: jest.Mocked<LLMClient>;

  beforeEach(() => {
    mockLLM = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          techniques: [{ id: 'T1059.001', name: 'PowerShell', confidence: 0.95 }],
          tactics: [{ id: 'TA0002', name: 'Execution' }],
          phase: 'Execution',
          reasoning: 'PowerShell execution detected',
        }),
      }),
    };
  });

  describe('successful mapping scenarios', () => {
    it('should map PowerShell execution to T1059.001', async () => {
      const alert = {
        'process.name': 'powershell.exe',
        'process.command_line': 'powershell -enc AAAABBBB...',
        'event.action': 'process_start',
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping).not.toBeNull();
      expect(mapping?.techniques).toContainEqual({
        id: 'T1059.001',
        name: 'PowerShell',
        confidence: 0.95,
      });
      expect(mapping?.tactics).toContainEqual({
        id: 'TA0002',
        name: 'Execution',
      });
      expect(mapping?.phase).toBe('Execution');
      expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
    });

    it('should map Windows Command Shell to T1059.003', async () => {
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({
          techniques: [{ id: 'T1059.003', name: 'Windows Command Shell', confidence: 0.90 }],
          tactics: [{ id: 'TA0002', name: 'Execution' }],
          phase: 'Execution',
          reasoning: 'cmd.exe execution',
        }),
      });

      const alert = {
        'process.name': 'cmd.exe',
        'process.command_line': 'cmd /c whoami',
        'event.action': 'process_start',
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping?.techniques[0].id).toBe('T1059.003');
    });

    it('should map network C2 communication to T1071', async () => {
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({
          techniques: [{ id: 'T1071.001', name: 'Web Protocols', confidence: 0.85 }],
          tactics: [{ id: 'TA0011', name: 'Command and Control' }],
          phase: 'Command and Control',
          reasoning: 'Suspicious HTTP traffic to known C2 server',
        }),
      });

      const alert = {
        'network.protocol': 'http',
        'network.direction': 'outbound',
        'source.ip': '10.0.0.5',
        'destination.ip': '198.51.100.200',
        'event.action': 'network_connection',
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping?.techniques[0].id).toBe('T1071.001');
      expect(mapping?.tactics[0].name).toBe('Command and Control');
    });
  });

  describe('insufficient data scenarios', () => {
    it('should return null for empty alert', async () => {
      const alert = {};
      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping).toBeNull();
      expect(mockLLM.invoke).not.toHaveBeenCalled(); // No LLM call for empty alerts
    });

    it('should return null for alert with only metadata fields', async () => {
      const alert = {
        '@timestamp': '2026-03-22T10:00:00Z',
        'event.kind': 'alert',
        'kibana.alert.uuid': '123',
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping).toBeNull();
      expect(mockLLM.invoke).not.toHaveBeenCalled();
    });
  });

  describe('error handling scenarios', () => {
    it('should return null when LLM throws error', async () => {
      mockLLM.invoke.mockRejectedValue(new Error('LLM timeout'));

      const alert = {
        'process.name': 'cmd.exe',
        'event.action': 'process_start',
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping).toBeNull(); // Graceful degradation
    });

    it('should return null when LLM returns invalid JSON', async () => {
      mockLLM.invoke.mockResolvedValue({
        content: 'This is not valid JSON',
      });

      const alert = {
        'process.name': 'cmd.exe',
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping).toBeNull();
    });

    it('should return null when LLM returns empty techniques', async () => {
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({
          techniques: [],
          tactics: [],
          phase: 'Unknown',
          reasoning: 'Insufficient evidence for mapping',
        }),
      });

      const alert = {
        'process.name': 'explorer.exe', // Benign process
      };

      const mapping = await mapAlertToMitre(alert, mockLLM);

      expect(mapping).toBeNull(); // No mapping for empty techniques
    });
  });

  describe('caching integration', () => {
    let mockCache: {
      get: jest.Mock;
      set: jest.Mock;
    };

    beforeEach(() => {
      mockCache = {
        get: jest.fn().mockReturnValue(null), // Cache miss by default
        set: jest.fn(),
      };
    });

    it('should use cache on second identical alert', async () => {
      const alert = {
        'process.name': 'powershell.exe',
        'process.command_line': 'powershell -enc AAA',
      };

      // First call - cache miss
      await mapAlertToMitreWithCache(alert, mockLLM, mockCache);
      expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      mockCache.get.mockReturnValue({
        techniques: [{ id: 'T1059.001', name: 'PowerShell', confidence: 0.95 }],
        tactics: [{ id: 'TA0002', name: 'Execution' }],
        phase: 'Execution',
        reasoning: 'Cached',
      });

      await mapAlertToMitreWithCache(alert, mockLLM, mockCache);
      expect(mockLLM.invoke).toHaveBeenCalledTimes(1); // No additional LLM call
    });

    it('should skip cache for different alerts', async () => {
      const alert1 = { 'process.name': 'powershell.exe' };
      const alert2 = { 'process.name': 'cmd.exe' };

      await mapAlertToMitreWithCache(alert1, mockLLM, mockCache);
      await mapAlertToMitreWithCache(alert2, mockLLM, mockCache);

      expect(mockLLM.invoke).toHaveBeenCalledTimes(2); // Two different alerts = two LLM calls
    });
  });
});
