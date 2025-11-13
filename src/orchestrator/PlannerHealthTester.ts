import OpenAI from "openai";
import { config } from "../config/env";
import { PlannerHealthSnapshot, HallucinationTestResult } from "./types";

/**
 * Phase 5: PlannerHealthTester runs hallucination probes against OpenAI planner
 * to detect degraded behavior and ensure model health
 */
export class PlannerHealthTester {
  private client: OpenAI;

  constructor() {
    if (!config.openaiApiKey) {
      throw new Error("PlannerHealthTester requires OPENAI_API_KEY");
    }
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl ?? undefined,
    });
  }

  /**
   * Run all health checks and return aggregated snapshot
   */
  async runHealthChecks(): Promise<PlannerHealthSnapshot> {
    const tests: HallucinationTestResult[] = [];

    // 1) Simple math sanity test
    tests.push(await this.runMathSanityTest());

    // 2) Simple coding reasoning test
    tests.push(await this.runCodingReasoningTest());

    // 3) Short consistency / instruction-following test
    tests.push(await this.runInstructionFollowingTest());

    // Compute aggregate score
    const overallScore =
      tests.length === 0
        ? 1
        : tests.reduce((sum, t) => sum + t.score, 0) / tests.length;

    const status: "ok" | "degraded" | "failing" =
      overallScore >= 0.85
        ? "ok"
        : overallScore >= 0.6
        ? "degraded"
        : "failing";

    const snapshot: PlannerHealthSnapshot = {
      modelId: config.openaiPlannerModel ?? "unknown",
      overallScore,
      tests,
      status,
      summary: this.buildSummary(status, overallScore, tests),
      checkedAt: new Date().toISOString(),
    };

    return snapshot;
  }

  private buildSummary(
    status: "ok" | "degraded" | "failing",
    overallScore: number,
    tests: HallucinationTestResult[],
  ): string {
    // Short human-readable summary
    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;
    return `Status: ${status}, score=${overallScore.toFixed(
      2,
    )}, passed ${passed}/${total} tests.`;
  }

  /**
   * Test 1: Basic arithmetic consistency
   */
  private async runMathSanityTest(): Promise<HallucinationTestResult> {
    const now = new Date().toISOString();

    try {
      const response = await this.client.chat.completions.create({
        model: config.openaiPlannerModel ?? "gpt-4",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are being checked for basic arithmetic consistency. Answer with just the final number.",
          },
          { role: "user", content: "What is 17 * 12?" },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      const trimmed = content.trim();

      const expected = "204";
      const passed = trimmed === expected;
      const score = passed ? 1 : 0;

      return {
        name: "math_sanity",
        passed,
        score,
        details: `Expected ${expected}, got "${trimmed}"`,
        ranAt: now,
      };
    } catch (err) {
      return {
        name: "math_sanity",
        passed: false,
        score: 0,
        details: `Error during test: ${String(err)}`,
        ranAt: now,
      };
    }
  }

  /**
   * Test 2: Basic coding reasoning
   */
  private async runCodingReasoningTest(): Promise<HallucinationTestResult> {
    const now = new Date().toISOString();

    try {
      const response = await this.client.chat.completions.create({
        model: config.openaiPlannerModel ?? "gpt-4",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are being checked for basic coding reasoning. Answer with just 'A', 'B', 'C', or 'D'.",
          },
          {
            role: "user",
            content:
              "In JavaScript, what does Array.prototype.map(...) return?\n\nA) It mutates the original array and returns void\nB) It returns a new array with the results of calling a function on every element\nC) It filters elements based on a predicate\nD) It reduces an array to a single value",
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      const trimmed = content.trim().toUpperCase();

      const expected = "B";
      const passed = trimmed.startsWith(expected);
      const score = passed ? 1 : 0;

      return {
        name: "code_reasoning",
        passed,
        score,
        details: `Expected ${expected}, got "${trimmed}"`,
        ranAt: now,
      };
    } catch (err) {
      return {
        name: "code_reasoning",
        passed: false,
        score: 0,
        details: `Error during test: ${String(err)}`,
        ranAt: now,
      };
    }
  }

  /**
   * Test 3: Instruction following
   */
  private async runInstructionFollowingTest(): Promise<HallucinationTestResult> {
    const now = new Date().toISOString();

    try {
      const response = await this.client.chat.completions.create({
        model: config.openaiPlannerModel ?? "gpt-4",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are being checked for instruction following. Answer EXACTLY with 'OK' if you understand.",
          },
          {
            role: "user",
            content:
              "Do not explain anything. Do not add any words. If you understand this message, reply with OK.",
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      const trimmed = content.trim().toUpperCase();

      const expected = "OK";
      const passed = trimmed === expected;
      const score = passed ? 1 : 0;

      return {
        name: "instruction_following",
        passed,
        score,
        details: `Expected ${expected}, got "${trimmed}"`,
        ranAt: now,
      };
    } catch (err) {
      return {
        name: "instruction_following",
        passed: false,
        score: 0,
        details: `Error during test: ${String(err)}`,
        ranAt: now,
      };
    }
  }
}
