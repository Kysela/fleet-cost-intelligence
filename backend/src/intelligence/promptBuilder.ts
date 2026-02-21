/**
 * Prompt Builder
 * 
 * Constructs structured prompts for the LLM from pre-computed fleet metrics.
 * Never includes raw GPS data — only aggregated, computed metrics.
 */

import type {
  AIInsightsRequest,
  DerivedVehicleMetrics,
  FleetMetrics,
  FleetCostEstimation,
  VehicleRanking,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Formats a number as percentage.
 */
function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a score with context.
 */
function formatScore(value: number): string {
  return `${value.toFixed(1)}/100`;
}

/**
 * Formats top risk vehicles as a string list.
 */
function formatTopRiskVehicles(vehicles: readonly VehicleRanking[]): string {
  if (vehicles.length === 0) {
    return 'No high-risk vehicles identified.';
  }

  return vehicles
    .map((v, i) => `${i + 1}. ${v.vehicleId} — Risk Score: ${formatScore(v.score)}`)
    .join('\n');
}

/**
 * Formats vehicle metrics as a summary table.
 */
function formatVehicleMetricsTable(
  metrics: readonly DerivedVehicleMetrics[]
): string {
  if (metrics.length === 0) {
    return 'No vehicle data available.';
  }

  const header = 'Vehicle | Efficiency | Risk | Idle Ratio | Distance (km) | Stops';
  const separator = '--------|------------|------|------------|---------------|------';

  const rows = metrics.map((m) =>
    [
      m.vehicleId.padEnd(7),
      formatScore(m.efficiencyScore).padStart(10),
      formatScore(m.riskScore).padStart(4),
      formatPercent(m.idleRatio * 100).padStart(10),
      m.totalDistanceKm.toFixed(1).padStart(13),
      m.numberOfStops.toString().padStart(5),
    ].join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the fleet overview section.
 */
function buildFleetOverview(fleetMetrics: FleetMetrics): string {
  return `
═══════════════════════════════════════════════════════════════════════════
FLEET OVERVIEW
═══════════════════════════════════════════════════════════════════════════
• Total Vehicles: ${fleetMetrics.totalVehicles}
• Analysis Period: ${fleetMetrics.periodStart} to ${fleetMetrics.periodEnd}
• Average Efficiency Score: ${formatScore(fleetMetrics.averageEfficiencyScore)}
• Average Risk Score: ${formatScore(fleetMetrics.averageRiskScore)}
• Total Distance: ${fleetMetrics.totalDistanceKm.toFixed(1)} km
• Total Idle Time: ${fleetMetrics.totalIdleTimeMinutes.toFixed(0)} minutes
• Average Idle Ratio: ${formatPercent(fleetMetrics.averageIdleRatio * 100)}`.trim();
}

/**
 * Builds the financial impact section.
 */
function buildFinancialImpact(fleetCosts: FleetCostEstimation): string {
  const highestCost = fleetCosts.highestCostVehicle;

  return `
═══════════════════════════════════════════════════════════════════════════
FINANCIAL IMPACT
═══════════════════════════════════════════════════════════════════════════
• Total Daily Idle Cost: ${formatCurrency(fleetCosts.totalDailyIdleCost)}
• Monthly Projected Idle Cost: ${formatCurrency(fleetCosts.totalMonthlyProjectedIdleCost)}
• Annual Risk-Adjusted Cost: ${formatCurrency(fleetCosts.totalRiskAdjustedAnnualCost)}
• Highest Cost Vehicle: ${highestCost?.vehicleId ?? 'N/A'} (${highestCost ? formatCurrency(highestCost.annualProjectedLoss) + '/year' : 'N/A'})`.trim();
}

/**
 * Builds the top risk vehicles section.
 */
function buildTopRiskSection(fleetMetrics: FleetMetrics): string {
  return `
═══════════════════════════════════════════════════════════════════════════
TOP RISK VEHICLES (by risk score)
═══════════════════════════════════════════════════════════════════════════
${formatTopRiskVehicles(fleetMetrics.topRiskVehicles)}`.trim();
}

/**
 * Builds the vehicle metrics summary section.
 */
function buildVehicleMetricsSection(
  metrics: readonly DerivedVehicleMetrics[]
): string {
  return `
═══════════════════════════════════════════════════════════════════════════
VEHICLE METRICS SUMMARY
═══════════════════════════════════════════════════════════════════════════
${formatVehicleMetricsTable(metrics)}`.trim();
}

/**
 * Builds the instruction section with expected schema.
 */
function buildInstructions(): string {
  return `
═══════════════════════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════
Analyze this fleet data and respond with ONLY a JSON object matching this exact schema:

{
  "executiveSummary": "string (2-3 sentences summarizing fleet health and primary concern)",
  "topRisk": {
    "category": "IDLE_TIME" | "SPEEDING" | "INEFFICIENCY" | "COST",
    "severity": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
    "description": "string (specific description of the top risk)",
    "affectedVehicles": ["vehicleId1", "vehicleId2"]
  },
  "costImpactExplanation": "string (business-focused explanation of financial impact)",
  "recommendations": [
    {
      "priority": 1,
      "action": "string (specific actionable recommendation)",
      "expectedImpact": "string (quantified expected savings or improvement)",
      "targetVehicles": ["vehicleId"] or "ALL"
    }
  ],
  "fleetHealthScore": number (0-100, your assessment of overall fleet health),
  "priorityScore": number (0-100, urgency of action needed, 100 = immediate action required)
}

RULES:
- Respond with ONLY valid JSON, no markdown code blocks, no explanation text
- recommendations array must have 1-5 items, sorted by priority (1 = highest)
- All fields are required
- fleetHealthScore: higher = healthier fleet
- priorityScore: higher = more urgent action needed
- category must be exactly one of: IDLE_TIME, SPEEDING, INEFFICIENCY, COST
- severity must be exactly one of: LOW, MODERATE, HIGH, CRITICAL
- Use actual vehicle IDs from the data provided`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * System prompt establishing AI role.
 */
export const SYSTEM_PROMPT = `You are a fleet operations intelligence analyst. Your task is to analyze pre-computed fleet metrics and provide actionable business insights. You always respond with valid JSON only, never with explanatory text or markdown formatting.`;

/**
 * Builds the complete prompt from fleet data.
 * 
 * @param request - Pre-computed fleet metrics (never raw GPS data)
 * @returns Complete prompt string for LLM
 */
export function buildPrompt(request: AIInsightsRequest): string {
  const sections = [
    'You are analyzing fleet operational data. Provide actionable intelligence insights.',
    '',
    buildFleetOverview(request.fleetMetrics),
    '',
    buildFinancialImpact(request.fleetCosts),
    '',
    buildTopRiskSection(request.fleetMetrics),
    '',
    buildVehicleMetricsSection(request.vehicleMetrics),
    '',
    buildInstructions(),
  ];

  return sections.join('\n');
}

/**
 * Validates that a request has sufficient data for analysis.
 */
export function validateRequest(request: AIInsightsRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.vehicleMetrics || request.vehicleMetrics.length === 0) {
    return { valid: false, error: 'No vehicle metrics provided' };
  }

  if (!request.fleetMetrics) {
    return { valid: false, error: 'No fleet metrics provided' };
  }

  if (!request.fleetCosts) {
    return { valid: false, error: 'No fleet costs provided' };
  }

  return { valid: true };
}
