/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureProductDocumentationInstalled } from './helpers';
import { loggerMock } from '@kbn/logging-mocks';

const mockLogger = loggerMock.create();
const mockProductDocManager = {
  getStatus: jest.fn(),
  install: jest.fn(),
  uninstall: jest.fn(),
  update: jest.fn(),
};

describe('helpers', () => {
  describe('ensureProductDocumentationInstalled', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should install product documentation if not installed', async () => {
      mockProductDocManager.getStatus.mockResolvedValue({ status: 'uninstalled' });
      mockProductDocManager.install.mockResolvedValue(null);

      await ensureProductDocumentationInstalled(mockProductDocManager, mockLogger);

      expect(mockProductDocManager.getStatus).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Installing product documentation for AIAssistantService'
      );
      expect(mockProductDocManager.install).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        2,
        'Successfully installed product documentation for AIAssistantService'
      );
    });

    it('should not install product documentation if already installed', async () => {
      mockProductDocManager.getStatus.mockResolvedValue({ status: 'installed' });

      await ensureProductDocumentationInstalled(mockProductDocManager, mockLogger);

      expect(mockProductDocManager.getStatus).toHaveBeenCalled();
      expect(mockProductDocManager.install).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        'Installing product documentation for AIAssistantService'
      );
    });
    it('should log a warning if install fails', async () => {
      mockProductDocManager.getStatus.mockResolvedValue({ status: 'not_installed' });
      mockProductDocManager.install.mockRejectedValue(new Error('Install failed'));

      await ensureProductDocumentationInstalled(mockProductDocManager, mockLogger);

      expect(mockProductDocManager.getStatus).toHaveBeenCalled();
      expect(mockProductDocManager.install).toHaveBeenCalled();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to install product documentation for AIAssistantService: Install failed'
      );
    });

    it('should log a warning if getStatus fails', async () => {
      mockProductDocManager.getStatus.mockRejectedValue(new Error('Status check failed'));

      await ensureProductDocumentationInstalled(mockProductDocManager, mockLogger);

      expect(mockProductDocManager.getStatus).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to get status of product documentation installation for AIAssistantService: Status check failed'
      );
      expect(mockProductDocManager.install).not.toHaveBeenCalled();
    });
  });
});
