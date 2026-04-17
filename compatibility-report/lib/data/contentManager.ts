import { contentLoader, ContentLoader } from './contentLoader';
import { ValidationResult, DomainKey } from './types';
import fs from 'fs';
import path from 'path';

/**
 * Content Management System
 * 
 * Provides utilities for managing and updating content without code changes.
 * Includes validation, backup, and content editing capabilities.
 */
export class ContentManager {
  private static instance: ContentManager;
  private contentLoader: ContentLoader;
  private dataDir: string;

  private constructor() {
    this.contentLoader = contentLoader;
    this.dataDir = path.join(process.cwd(), 'lib', 'data');
  }

  public static getInstance(): ContentManager {
    if (!ContentManager.instance) {
      ContentManager.instance = new ContentManager();
    }
    return ContentManager.instance;
  }

  /**
   * Get all content files and their paths
   */
  public getContentFiles(): Record<string, string> {
    return {
      domainDescriptions: path.join(this.dataDir, 'domain_descriptions.json'),
      facetDescriptions: path.join(this.dataDir, 'facet_descriptions.json'),
      facetInterpretations: path.join(this.dataDir, 'facet_interpretations.json'),
      assessmentPrompts: path.join(this.dataDir, 'assessment_prompts.json'),
      facetHints: path.join(this.dataDir, 'facet_hints.json'),
      anchorStatements: path.join(this.dataDir, 'anchor_statements.json'),
      confirmationQuestions: path.join(this.dataDir, 'confirmation_questions.json')
    };
  }

  /**
   * Validate all content files
   */
  public validateAllContent(): ValidationResult {
    return this.contentLoader.validateAllContent();
  }

  /**
   * Get content summary for management interface
   */
  public getContentSummary(): {
    files: Array<{
      name: string;
      path: string;
      size: number;
      lastModified: Date;
      isValid: boolean;
      errors: string[];
    }>;
    overallStatus: {
      isValid: boolean;
      totalErrors: number;
      totalWarnings: number;
    };
  } {
    const files = this.getContentFiles();
    const fileSummary = Object.entries(files).map(([name, filePath]) => {
      const stats = fs.statSync(filePath);
      const validation = this.validateFile(name);
      
      return {
        name,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        isValid: validation.isValid,
        errors: validation.errors
      };
    });

    const overallValidation = this.validateAllContent();
    
    return {
      files: fileSummary,
      overallStatus: {
        isValid: overallValidation.isValid,
        totalErrors: overallValidation.errors.length,
        totalWarnings: overallValidation.warnings.length
      }
    };
  }

  /**
   * Validate a specific content file
   */
  private validateFile(fileName: string): ValidationResult {
    try {
      switch (fileName) {
        case 'domainDescriptions':
          return this.contentLoader.validateAllContent();
        case 'facetDescriptions':
          return this.contentLoader.validateAllContent();
        case 'facetInterpretations':
          return this.contentLoader.validateAllContent();
        case 'assessmentPrompts':
          return this.contentLoader.validateAllContent();
        case 'facetHints':
          return this.contentLoader.validateAllContent();
        case 'anchorStatements':
          return this.contentLoader.validateAllContent();
        case 'confirmationQuestions':
          return this.contentLoader.validateAllContent();
        default:
          return { isValid: false, errors: [`Unknown file: ${fileName}`], warnings: [] };
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: [`Validation error for ${fileName}: ${error}`], 
        warnings: [] 
      };
    }
  }

  /**
   * Create backup of all content files
   */
  public createBackup(backupDir?: string): string {
    const backupPath = backupDir || path.join(this.dataDir, 'backups');
    
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = path.join(backupPath, `content-backup-${timestamp}`);
    fs.mkdirSync(backupSubDir, { recursive: true });

    const files = this.getContentFiles();
    Object.entries(files).forEach(([name, filePath]) => {
      const fileName = path.basename(filePath);
      const backupFilePath = path.join(backupSubDir, fileName);
      fs.copyFileSync(filePath, backupFilePath);
    });

    return backupSubDir;
  }

  /**
   * Get content editing guidelines
   */
  public getEditingGuidelines(): {
    rules: string[];
    examples: Record<string, any>;
    validation: {
      minLengths: Record<string, number>;
      maxLengths: Record<string, number>;
    };
  } {
    return {
      rules: [
        'Always maintain the exact JSON structure - do not change keys or nesting',
        'All text content must be strings - no numbers or booleans for text fields',
        'Domain keys must be exactly: O, C, E, A, N (case sensitive)',
        'Facet names must match exactly: Imagination, Artistic Interests, etc.',
        'Anchor statements must be arrays of exactly 2 strings',
        'Facet interpretations must have high, medium, low properties',
        'Assessment prompts must have q1, q2, q3 properties',
        'Test changes with validation before deploying',
        'Create backups before making major changes'
      ],
      examples: {
        domainDescription: {
          label: "Openness to Experience",
          shortDescription: "Describes the extent to which...",
          fullDescription: "Openness to Experience describes...",
          results: {
            low: "You tend to be...",
            neutral: "You are moderately...",
            high: "You are highly..."
          }
        },
        facetInterpretation: {
          high: "You are highly imaginative...",
          medium: "You have a moderate level...",
          low: "You tend to be more practical..."
        },
        anchorStatements: ["I am very imaginative", "I am not very imaginative"]
      },
      validation: {
        minLengths: {
          description: 10,
          interpretation: 50,
          prompt: 20,
          hint: 10,
          anchor: 10,
          confirmation: 20
        },
        maxLengths: {
          description: 2000,
          interpretation: 1000,
          prompt: 200,
          hint: 100,
          anchor: 150,
          confirmation: 200
        }
      }
    };
  }

  /**
   * Get content statistics
   */
  public getContentStats(): {
    totalFiles: number;
    totalSize: number;
    contentCounts: {
      domains: number;
      facets: number;
      interpretations: number;
      prompts: number;
      hints: number;
      anchors: number;
      confirmations: number;
    };
  } {
    const files = this.getContentFiles();
    let totalSize = 0;
    
    Object.values(files).forEach(filePath => {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    const domains = this.contentLoader.getAllDomains();
    const facets = domains.reduce((total, domain) => {
      return total + this.contentLoader.getFacetsForDomain(domain).length;
    }, 0);

    return {
      totalFiles: Object.keys(files).length,
      totalSize,
      contentCounts: {
        domains: domains.length,
        facets,
        interpretations: facets * 3, // high, medium, low for each facet
        prompts: domains.length * 3, // q1, q2, q3 for each domain
        hints: facets,
        anchors: facets * 2, // 2 statements per facet
        confirmations: facets
      }
    };
  }
}

// Export singleton instance
export const contentManager = ContentManager.getInstance();
