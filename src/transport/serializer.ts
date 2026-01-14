import type { UnifiedRequest, UnifiedResponse } from '../types/index.js';

/**
 * JSON serialization utilities for safe and consistent serialization.
 */
export class Serializer {
  /**
   * Serialize UnifiedRequest to JSON string.
   */
  static serializeRequest(request: UnifiedRequest): string {
    return JSON.stringify(request, null, 2);
  }

  /**
   * Serialize UnifiedResponse to JSON string.
   */
  static serializeResponse(response: UnifiedResponse): string {
    return JSON.stringify(response, null, 2);
  }

  /**
   * Deserialize JSON string to UnifiedRequest.
   */
  static deserializeRequest(json: string): UnifiedRequest {
    return JSON.parse(json) as UnifiedRequest;
  }

  /**
   * Deserialize JSON string to UnifiedResponse.
   */
  static deserializeResponse(json: string): UnifiedResponse {
    return JSON.parse(json) as UnifiedResponse;
  }

  /**
   * Stringify object without circular references.
   */
  static stringify(obj: any, pretty = false): string {
    const seen = new Set();

    const replacer = (_key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };

    return JSON.stringify(obj, replacer, pretty ? 2 : 0);
  }

  /**
   * Pretty print object.
   */
  static prettyPrint(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Compact print object.
   */
  static compactPrint(obj: any): string {
    return JSON.stringify(obj);
  }

  /**
   * Clone object deeply.
   */
  static clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  /**
   * Merge objects deeply.
   */
  static merge(target: any, source: any): any {
    const result = JSON.parse(JSON.stringify(target));

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.merge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Extract specific fields from object.
   */
  static pick<T extends Record<string, any>>(obj: T, keys: (keyof T)[]): Partial<T> {
    const result: any = {};
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * Omit specific fields from object.
   */
  static omit<T extends Record<string, any>>(obj: T, keys: (keyof T)[]): Partial<T> {
    const result = JSON.parse(JSON.stringify(obj));
    for (const key of keys) {
      delete result[key];
    }
    return result;
  }
}
