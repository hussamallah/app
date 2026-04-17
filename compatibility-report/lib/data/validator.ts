import { 
  DomainKey, 
  DomainDescriptions, 
  FacetDescriptions, 
  FacetInterpretations, 
  AssessmentPrompts, 
  FacetHints, 
  AnchorStatements, 
  ConfirmationQuestions,
  ValidationResult,
  ContentValidator,
  EXPECTED_FACETS,
  VALIDATION_RULES
} from './types';

export class ContentValidatorImpl implements ContentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  private reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  private addError(message: string): void {
    this.errors.push(message);
  }

  private addWarning(message: string): void {
    this.warnings.push(message);
  }

  private validateString(value: any, fieldName: string, minLength: number, maxLength: number): boolean {
    if (typeof value !== 'string') {
      this.addError(`${fieldName} must be a string`);
      return false;
    }
    if (value.length < minLength) {
      this.addError(`${fieldName} is too short (${value.length} < ${minLength})`);
      return false;
    }
    if (value.length > maxLength) {
      this.addWarning(`${fieldName} is very long (${value.length} > ${maxLength})`);
    }
    return true;
  }

  private validateDomainKey(key: string): key is DomainKey {
    return ['O', 'C', 'E', 'A', 'N'].includes(key);
  }

  private validateFacets(domain: DomainKey, facets: string[], context: string): boolean {
    const expectedFacets = EXPECTED_FACETS[domain];
    let isValid = true;

    // Check for missing facets
    for (const expected of expectedFacets) {
      if (!facets.includes(expected)) {
        this.addError(`Missing facet '${expected}' in ${context} for domain ${domain}`);
        isValid = false;
      }
    }

    // Check for extra facets
    for (const facet of facets) {
      if (!expectedFacets.includes(facet)) {
        this.addWarning(`Unexpected facet '${facet}' in ${context} for domain ${domain}`);
      }
    }

    return isValid;
  }

  validateDomainDescriptions(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Domain descriptions must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing domain description for ${domain}`);
        continue;
      }

      const desc = data[domain];
      
      // Validate required fields
      this.validateString(desc.label, `${domain}.label`, 5, 50);
      this.validateString(desc.shortDescription, `${domain}.shortDescription`, VALIDATION_RULES.MIN_DESCRIPTION_LENGTH, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH);
      this.validateString(desc.fullDescription, `${domain}.fullDescription`, VALIDATION_RULES.MIN_DESCRIPTION_LENGTH, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH);

      // Validate results
      if (desc.results) {
        this.validateString(desc.results.low, `${domain}.results.low`, VALIDATION_RULES.MIN_DESCRIPTION_LENGTH, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH);
        this.validateString(desc.results.neutral, `${domain}.results.neutral`, VALIDATION_RULES.MIN_DESCRIPTION_LENGTH, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH);
        this.validateString(desc.results.high, `${domain}.results.high`, VALIDATION_RULES.MIN_DESCRIPTION_LENGTH, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH);
      } else {
        this.addError(`Missing results for domain ${domain}`);
      }
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateFacetDescriptions(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Facet descriptions must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing facet descriptions for domain ${domain}`);
        continue;
      }

      const facets = Object.keys(data[domain]);
      this.validateFacets(domain, facets, 'facet descriptions');

      for (const facet of facets) {
        this.validateString(data[domain][facet], `${domain}.${facet}`, VALIDATION_RULES.MIN_DESCRIPTION_LENGTH, VALIDATION_RULES.MAX_DESCRIPTION_LENGTH);
      }
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateFacetInterpretations(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Facet interpretations must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing facet interpretations for domain ${domain}`);
        continue;
      }

      const facets = Object.keys(data[domain]);
      this.validateFacets(domain, facets, 'facet interpretations');

      for (const facet of facets) {
        const interpretation = data[domain][facet];
        if (!interpretation || typeof interpretation !== 'object') {
          this.addError(`Invalid interpretation structure for ${domain}.${facet}`);
          continue;
        }

        this.validateString(interpretation.high, `${domain}.${facet}.high`, VALIDATION_RULES.MIN_INTERPRETATION_LENGTH, VALIDATION_RULES.MAX_INTERPRETATION_LENGTH);
        this.validateString(interpretation.medium, `${domain}.${facet}.medium`, VALIDATION_RULES.MIN_INTERPRETATION_LENGTH, VALIDATION_RULES.MAX_INTERPRETATION_LENGTH);
        this.validateString(interpretation.low, `${domain}.${facet}.low`, VALIDATION_RULES.MIN_INTERPRETATION_LENGTH, VALIDATION_RULES.MAX_INTERPRETATION_LENGTH);
      }
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateAssessmentPrompts(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Assessment prompts must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing assessment prompts for domain ${domain}`);
        continue;
      }

      const prompts = data[domain];
      this.validateString(prompts.q1, `${domain}.q1`, VALIDATION_RULES.MIN_PROMPT_LENGTH, VALIDATION_RULES.MAX_PROMPT_LENGTH);
      this.validateString(prompts.q2, `${domain}.q2`, VALIDATION_RULES.MIN_PROMPT_LENGTH, VALIDATION_RULES.MAX_PROMPT_LENGTH);
      this.validateString(prompts.q3, `${domain}.q3`, VALIDATION_RULES.MIN_PROMPT_LENGTH, VALIDATION_RULES.MAX_PROMPT_LENGTH);
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateFacetHints(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Facet hints must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing facet hints for domain ${domain}`);
        continue;
      }

      const facets = Object.keys(data[domain]);
      this.validateFacets(domain, facets, 'facet hints');

      for (const facet of facets) {
        this.validateString(data[domain][facet], `${domain}.${facet}`, VALIDATION_RULES.MIN_HINT_LENGTH, VALIDATION_RULES.MAX_HINT_LENGTH);
      }
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateAnchorStatements(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Anchor statements must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing anchor statements for domain ${domain}`);
        continue;
      }

      const facets = Object.keys(data[domain]);
      this.validateFacets(domain, facets, 'anchor statements');

      for (const facet of facets) {
        const statements = data[domain][facet];
        if (!Array.isArray(statements) || statements.length < 2) {
          this.addError(`Anchor statements for ${domain}.${facet} must be an array of at least 2 strings`);
          continue;
        }

        this.validateString(statements[0], `${domain}.${facet}[0]`, VALIDATION_RULES.MIN_ANCHOR_LENGTH, VALIDATION_RULES.MAX_ANCHOR_LENGTH);
        this.validateString(statements[1], `${domain}.${facet}[1]`, VALIDATION_RULES.MIN_ANCHOR_LENGTH, VALIDATION_RULES.MAX_ANCHOR_LENGTH);
        
        // Validate additional statements if they exist
        for (let i = 2; i < statements.length; i++) {
          this.validateString(statements[i], `${domain}.${facet}[${i}]`, VALIDATION_RULES.MIN_ANCHOR_LENGTH, VALIDATION_RULES.MAX_ANCHOR_LENGTH);
        }
      }
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateConfirmationQuestions(data: any): ValidationResult {
    this.reset();

    if (!data || typeof data !== 'object') {
      this.addError('Confirmation questions must be an object');
      return { isValid: false, errors: this.errors, warnings: this.warnings };
    }

    for (const domain of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
      if (!data[domain]) {
        this.addError(`Missing confirmation questions for domain ${domain}`);
        continue;
      }

      const facets = Object.keys(data[domain]);
      this.validateFacets(domain, facets, 'confirmation questions');

      for (const facet of facets) {
        this.validateString(data[domain][facet], `${domain}.${facet}`, VALIDATION_RULES.MIN_CONFIRMATION_LENGTH, VALIDATION_RULES.MAX_CONFIRMATION_LENGTH);
      }
    }

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  validateAll(): ValidationResult {
    this.reset();

    // This would be called with actual data in the content loader
    // For now, return a placeholder
    this.addError('validateAll() should be called with actual data');
    return { isValid: false, errors: this.errors, warnings: this.warnings };
  }
}

export const contentValidator = new ContentValidatorImpl();
