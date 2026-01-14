/**
 * Tests for FileReader tool
 */

import { FileReader } from '../../../src/tools/implementations/file-reader';

describe('FileReader', () => {
  let tool: FileReader;

  beforeEach(() => {
    tool = new FileReader({
      allowedPaths: ['./tests', './src'],
      forbiddenPaths: ['/etc', '/root'],
      maxFileSize: 1024 * 1024 // 1MB
    });
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('read_file');
    });

    it('should have description', () => {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
    });

    it('should have input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toContain('path');
    });
  });

  describe('validate', () => {
    it('should validate correct input', () => {
      const result = tool.validate({
        path: '/test/file.ts'
      });

      expect(result.valid).toBe(true);
    });

    it('should reject missing path', () => {
      const result = tool.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid encoding', () => {
      const result = tool.validate({
        path: '/test/file.ts',
        encoding: 'invalid-encoding'
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('isSafe', () => {
    it('should allow files in allowed paths', () => {
      const result = tool.isSafe({
        path: 'tests/fixtures/sample.ts'
      });

      expect(result).toBe(true);
    });

    it('should block path traversal attacks', () => {
      const result = tool.isSafe({
        path: '../../../etc/passwd'
      });

      expect(result).toBe(false);
    });

    it('should block forbidden paths', () => {
      const result = tool.isSafe({
        path: '/etc/passwd'
      });

      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should return error for non-existent file', async () => {
      const result = await tool.execute({
        path: '/non/existent/file.ts'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate input before execution', async () => {
      const result = await tool.execute({
        path: '', // Empty path
        encoding: 'invalid'
      });

      expect(result.success).toBe(false);
    });

    it('should check security before execution', async () => {
      const result = await tool.execute({
        path: '/etc/passwd'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });
});
