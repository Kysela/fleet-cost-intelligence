/**
 * Fallback Generator
 * 
 * Generates deterministic insights when LLM is unavailable or fails.
 * Based purely on computed metrics, no AI involved.
 */

import type {
  AIInsightsRequest,
  AIInsightsResponse,
  RiskCategory,
  RiskSeverity,
  AIRecommendation,
} from '../types';
import { clamp } from '../utils/timeUtils';

// ═══════════════════════════════════════════════════════════════════════════
// RISK ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determines the primary risk category from metrics.
 */
function determinePrimaryRisk(request: AIInsightsRequest): {
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  affectedVehicles: string[];
} {
  const { vehicleMetrics, fleetCosts } = request;

  // Calculate averages
  const avgIdleRatio =
    vehicleMetrics.reduce((sum, v) => sum + v.idleRatio, 0) / vehicleMetrics.length;
  const avgSpeedingRatio =
    vehicleMetrics.reduce((sum, v) => sum + v.aggressiveDrivingRatio, 0) /
    vehicleMetrics.length;
  const avgEfficiency =
    vehicleMetrics.reduce((sum, v) => sum + v.efficiencyScore, 0) / vehicleMetrics.length;

  // Find vehicles with issues
  const highIdleVehicles = vehicleMetrics
    .filter((v) => v.idleRatio > 0.3)
    .map((v) => v.vehicleId);
  const speedingVehicles = vehicleMetrics
    .filter((v) => v.aggressiveDrivingRatio > 0.1)
    .map((v) => v.vehicleId);
  const inefficientVehicles = vehicleMetrics
    .filter((v) => v.efficiencyScore < 50)
    .map((v) => v.vehicleId);

  // Determine primary risk
  let category: RiskCategory;
  let description: string;
  let affectedVehicles: string[];

  if (avgIdleRatio > 0.35) {
    category = 'IDLE_TIME';
    description = `Fleet average idle ratio is ${(avgIdleRatio * 100).toFixed(1)}%, significantly above optimal levels. This represents unnecessary fuel consumption and lost productivity.`;
    affectedVehicles = highIdleVehicles;
  } else if (avgSpeedingRatio > 0.15) {
    category = 'SPEEDING';
    description = `Fleet average speeding ratio is ${(avgSpeedingRatio * 100).toFixed(1)}%, indicating elevated insurance risk and potential safety concerns.`;
    affectedVehicles = speedingVehicles;
  } else if (avgEfficiency < 50) {
    category = 'INEFFICIENCY';
    description = `Fleet average efficiency score is ${avgEfficiency.toFixed(1)}/100, below acceptable thresholds. Multiple vehicles require operational review.`;
    affectedVehicles = inefficientVehicles;
  } else if (fleetCosts.totalRiskAdjustedAnnualCost > 10000) {
    category = 'COST';
    description = `Projected annual costs exceed $${fleetCosts.totalRiskAdjustedAnnualCost.toFixed(0)}, primarily driven by idle time and operational inefficiencies.`;
    affectedVehicles = vehicleMetrics
      .slice(0, 3)
      .map((v) => v.vehicleId);
  } else {
    category = 'IDLE_TIME';
    description = 'Fleet operations within acceptable parameters with room for optimization in idle time reduction.';
    affectedVehicles = highIdleVehicles.slice(0, 3);
  }

  // Determine severity
  let severity: RiskSeverity;
  const avgRisk =
    vehicleMetrics.reduce((sum, v) => sum + v.riskScore, 0) / vehicleMetrics.length;

  if (avgRisk >= 70) {
    severity = 'CRITICAL';
  } else if (avgRisk >= 50) {
    severity = 'HIGH';
  } else if (avgRisk >= 30) {
    severity = 'MODERATE';
  } else {
    severity = 'LOW';
  }

  return { category, severity, description, affectedVehicles };
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates deterministic recommendations based on metrics.
 */
function generateRecommendations(request: AIInsightsRequest): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const { vehicleMetrics, fleetCosts } = request;

  // Find worst performers
  const sortedByEfficiency = [...vehicleMetrics].sort(
    (a, b) => a.efficiencyScore - b.efficiencyScore
  );
  const worstVehicles = sortedByEfficiency.slice(0, 3);

  // Recommendation 1: Address highest cost vehicle
  if (fleetCosts.highestCostVehicle) {
    recommendations.push({
      priority: 1,
      action: `Review operations for vehicle ${fleetCosts.highestCostVehicle.vehicleId} which has the highest projected annual cost of $${fleetCosts.highestCostVehicle.annualProjectedLoss.toFixed(0)}.`,
      expectedImpact: `Potential savings of up to $${(fleetCosts.highestCostVehicle.monthlyProjectedIdleCost * 0.3).toFixed(0)}/month through idle time reduction.`,
      targetVehicles: [fleetCosts.highestCostVehicle.vehicleId],
    });
  }

  // Recommendation 2: Fleet-wide idle reduction
  const avgIdleRatio =
    vehicleMetrics.reduce((sum, v) => sum + v.idleRatio, 0) / vehicleMetrics.length;
  if (avgIdleRatio > 0.25) {
    recommendations.push({
      priority: 2,
      action: 'Implement fleet-wide idle time reduction program with driver training and automated engine shutoff policies.',
      expectedImpact: `Reducing average idle ratio by 10% could save approximately $${(fleetCosts.totalMonthlyProjectedIdleCost * 0.1).toFixed(0)}/month.`,
      targetVehicles: 'ALL',
    });
  }

  // Recommendation 3: Focus on worst performers
  if (worstVehicles.length > 0 && worstVehicles[0]) {
    const worst = worstVehicles[0];
    recommendations.push({
      priority: 3,
      action: `Conduct operational audit for ${worst.vehicleId} (efficiency score: ${worst.efficiencyScore.toFixed(1)}/100) to identify specific improvement areas.`,
      expectedImpact: 'Improving lowest-performing vehicle efficiency by 20% typically improves fleet average by 5-8%.',
      targetVehicles: worstVehicles.map((v) => v.vehicleId),
    });
  }

  // Recommendation 4: Route optimization
  recommendations.push({
    priority: 4,
    action: 'Consider implementing route optimization software to reduce total distance and improve delivery efficiency.',
    expectedImpact: 'Route optimization typically yields 10-15% reduction in distance traveled and fuel consumption.',
    targetVehicles: 'ALL',
  });

  return recommendations.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a fallback AI response from metrics alone.
 * Used when LLM is unavailable or fails.
 * 
 * @param request - Pre-computed fleet metrics
 * @returns Deterministic insights response
 */
export function generateFallbackInsights(
  request: AIInsightsRequest
): AIInsightsResponse {
  const { vehicleMetrics, fleetMetrics, fleetCosts } = request;

  // Calculate fleet health score (inverse of average risk)
  const avgRisk =
    vehicleMetrics.reduce((sum, v) => sum + v.riskScore, 0) / vehicleMetrics.length;
  const avgEfficiency =
    vehicleMetrics.reduce((sum, v) => sum + v.efficiencyScore, 0) / vehicleMetrics.length;

  const fleetHealthScore = Math.round(
    clamp((avgEfficiency * 0.6 + (100 - avgRisk) * 0.4), 0, 100)
  );

  // Priority score based on costs and risks
  const dailyCostPerVehicle =
    fleetCosts.totalDailyIdleCost / fleetMetrics.totalVehicles;
  const priorityScore = Math.round(
    clamp(
      (avgRisk * 0.4) +
      (dailyCostPerVehicle > 10 ? 30 : dailyCostPerVehicle > 5 ? 20 : 10) +
      ((100 - avgEfficiency) * 0.3),
      0,
      100
    )
  );

  const topRisk = determinePrimaryRisk(request);
  const recommendations = generateRecommendations(request);

  return {
    executiveSummary: `Fleet of ${fleetMetrics.totalVehicles} vehicles analyzed. Average efficiency score: ${avgEfficiency.toFixed(1)}/100. Total projected daily idle cost: $${fleetCosts.totalDailyIdleCost.toFixed(2)}. Primary concern: ${topRisk.category.toLowerCase().replace('_', ' ')}.`,
    topRisk,
    costImpactExplanation: `The fleet incurs an estimated $${fleetCosts.totalDailyIdleCost.toFixed(2)} daily in idle costs, projecting to $${fleetCosts.totalMonthlyProjectedIdleCost.toFixed(0)} monthly and $${fleetCosts.totalRiskAdjustedAnnualCost.toFixed(0)} annually when accounting for risk factors. The highest-cost vehicle (${fleetCosts.highestCostVehicle?.vehicleId ?? 'N/A'}) contributes disproportionately to these losses.`,
    recommendations,
    fleetHealthScore,
    priorityScore,
  };
}
