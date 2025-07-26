// DROP Datum File Service
// Handles import/export of datum files

import type { Datum } from '../DataModel/types';
import { DatumBinaryFormat } from './DatumBinaryFormat';

export interface ImportResult {
  success: boolean;
  datum?: Datum;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export class DatumFileService {
  
  /**
   * Imports a datum file from user selection
   */
  static async importDatum(): Promise<ImportResult> {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.datum,.dat';
      input.style.display = 'none';
      
      return new Promise((resolve) => {
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve({ success: false, error: 'No file selected' });
            return;
          }
          
          try {
            const result = await this.importDatumFromFile(file);
            resolve(result);
          } catch (error) {
            resolve({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown import error' 
            });
          }
        };
        
        input.oncancel = () => {
          resolve({ success: false, error: 'Import cancelled' });
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown import error' 
      };
    }
  }
  
  /**
   * Imports datum from File object
   */
  static async importDatumFromFile(file: File): Promise<ImportResult> {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Validate file format
      if (!DatumBinaryFormat.validateFile(data)) {
        throw new Error('Invalid datum file format');
      }
      
      // Parse binary data
      const datum = DatumBinaryFormat.binaryToDatum(data);
      
      // Update datum metadata
      datum.name = datum.name || file.name.replace(/\.[^/.]+$/, '');
      datum.modifiedAt = new Date();
      
      return {
        success: true,
        datum
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown import error'
      };
    }
  }
  
  /**
   * Exports datum to binary file
   */
  static async exportDatum(datum: Datum, filename?: string): Promise<ExportResult> {
    try {
      // Convert datum to binary format
      const binaryData = DatumBinaryFormat.datumToBinary(datum);
      
      // Create blob
      const blob = new Blob([binaryData], { type: 'application/octet-stream' });
      
      // Generate filename if not provided
      const exportFilename = filename || this.generateFilename(datum);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFilename;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return {
        success: true,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }
  
  /**
   * Exports datum as JSON (for debugging/backup)
   */
  static async exportDatumAsJson(datum: Datum, filename?: string): Promise<ExportResult> {
    try {
      const jsonData = JSON.stringify(datum, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      const exportFilename = filename || this.generateFilename(datum, 'json');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFilename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return {
        success: true,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }
  
  /**
   * Imports datum from JSON file
   */
  static async importDatumFromJson(): Promise<ImportResult> {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      
      return new Promise((resolve) => {
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve({ success: false, error: 'No file selected' });
            return;
          }
          
          try {
            const text = await file.text();
            const datum = JSON.parse(text) as Datum;
            
            // Validate datum structure
            if (!this.validateDatumStructure(datum)) {
              throw new Error('Invalid datum JSON structure');
            }
            
            // Update metadata
            datum.modifiedAt = new Date();
            
            resolve({
              success: true,
              datum
            });
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'JSON parsing error'
            });
          }
        };
        
        input.oncancel = () => {
          resolve({ success: false, error: 'Import cancelled' });
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown import error'
      };
    }
  }
  
  /**
   * Validates datum structure
   */
  private static validateDatumStructure(datum: unknown): datum is Datum {
    if (!datum || typeof datum !== 'object') {
      return false;
    }
    
    const datumObj = datum as Record<string, unknown>;
    
    // Check required fields
    if (!Array.isArray(datumObj.frames) || 
        typeof datumObj.frameCount !== 'number' ||
        typeof datumObj.bandCount !== 'number') {
      return false;
    }
    
    // Check frames structure
    for (const frame of datumObj.frames as unknown[]) {
      if (!frame || typeof frame !== 'object' || !('bands' in frame)) {
        return false;
      }
      
      const frameObj = frame as Record<string, unknown>;
      if (!Array.isArray(frameObj.bands)) {
        return false;
      }
      
      if (frameObj.bands.length !== 20) {
        return false;
      }
      
      if (!frameObj.bands.every((band: unknown) => typeof band === 'number')) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Gets file info from uploaded file
   */
  static async getFileInfo(file: File): Promise<{ name: string; frames: number; size: number } | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      return DatumBinaryFormat.getFileInfo(data);
    } catch {
      return null;
    }
  }
  
  /**
   * Generates filename for export
   */
  private static generateFilename(datum: Datum, extension = 'datum'): string {
    const name = datum.name || 'datum';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const frames = datum.frameCount;
    
    return `${name}_${frames}f_${timestamp}.${extension}`;
  }
  
  /**
   * Validates file before processing
   */
  static validateFileBeforeImport(file: File): { valid: boolean; error?: string } {
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return {
        valid: false,
        error: 'File too large (max 50MB)'
      };
    }
    
    // Check file extension
    const validExtensions = ['.datum', '.dat', '.json'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      return {
        valid: false,
        error: 'Invalid file type. Expected .datum, .dat, or .json'
      };
    }
    
    return { valid: true };
  }
}