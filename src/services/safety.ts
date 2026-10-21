export interface SafetyCheckResult {
  hasWarning: boolean;
  warnings: string[];
}

export function evaluatePromptSafety(text: string): SafetyCheckResult {
  const warnings: string[] = [];

  // Credit card detection (Luhn-like patterns)
  const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/;
  if (ccRegex.test(text.replace(/[-\s]/g, ''))) {
    warnings.push('Credit card numbers are sensitive. Avoid sharing payment cards.');
  }

  // SSN (US standard)
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    warnings.push('Social Security Number detected. Please do not share government IDs.');
  }

  // API keys / Secrets
  if (/(?:AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z]{10,})/.test(text)) {
    warnings.push('API key or authentication token detected. Keep private tokens confidential.');
  }

  // Passwords
  if (/(?:password|passwd|secret)\s*[:=]\s*["']?[^\s"']{6,}["']?/i.test(text)) {
    warnings.push('Password pattern detected. Never share real passwords.');
  }

  // Medical warning advisory
  if (/\b(?:diagnose my|prescribe|cure for cancer|chest pain heart attack|dosage of medication)\b/i.test(text)) {
    warnings.push('Medical Notice: AI Buddy provides general info only, not clinical medical diagnosis. Seek professional healthcare advice for medical emergencies.');
  }

  // Legal advice advisory
  if (/\b(?:legal lawsuit|sue someone|sign contract clause legal representation)\b/i.test(text)) {
    warnings.push('Legal Notice: AI Buddy is not an attorney. Consult a certified lawyer for legal counsel.');
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
  };
}
