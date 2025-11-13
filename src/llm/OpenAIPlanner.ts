import OpenAI from 'openai';
import { PlannerLLM } from './PlannerLLM';
import {
  ProjectConfig,
  ProjectStateObject,
  PlanProjectResult,
  PlanNextPhaseResult,
  AssessPhaseParams,
  AssessPhaseResult,
} from '../orchestrator/types';

/**
 * OpenAI implementation of PlannerLLM
 * Phase 2: Real implementation with GPT API calls
 */
export class OpenAIPlanner implements PlannerLLM {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4', baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
    this.model = model;
  }

  /**
   * Plan the entire project and break it into phases
   */
  async planProject(config: ProjectConfig): Promise<PlanProjectResult> {
    const prompt = `You are an expert software project planner. Analyze the following project and create a detailed phase plan.

Project Information:
- Name: ${config.name}
- Description: ${config.description}
- Repository Path: ${config.repoPath}

Your task:
1. Break down this project into logical, sequential phases
2. Each phase should be a clear, deliverable milestone
3. Keep phases focused and manageable
4. Return 3-7 phases typically

Return your response as a JSON object with this structure:
{
  "phases": [
    {
      "number": 1,
      "name": "Phase name",
      "description": "Detailed description of what this phase accomplishes"
    }
  ]
}

Return ONLY the JSON, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert software project planner. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      // Validate response structure
      if (!result.phases || !Array.isArray(result.phases)) {
        throw new Error('Invalid response format: missing phases array');
      }

      return result as PlanProjectResult;
    } catch (error) {
      console.error('OpenAIPlanner.planProject error:', error);
      throw new Error(`Failed to plan project: ${(error as Error).message}`);
    }
  }

  /**
   * Plan the next phase based on current project state
   */
  async planNextPhase(pso: ProjectStateObject): Promise<PlanNextPhaseResult> {
    const currentPhase = pso.phases.find(p => p.number === pso.currentPhase);

    if (!currentPhase) {
      throw new Error('No current phase found in PSO');
    }

    const prompt = `You are an expert software project planner. Generate a detailed instruction for the next phase of development.

Project State:
- Project ID: ${pso.projectId}
- Summary: ${pso.summary || 'Not yet available'}
- Current Phase: ${currentPhase.number} - ${currentPhase.name}
- Phase Description: ${currentPhase.description || 'No description'}

Previous Phases:
${pso.phases
  .filter(p => p.number < currentPhase.number)
  .map(p => `- Phase ${p.number}: ${p.name} (${p.status})`)
  .join('\n')}

Your task:
Create a clear, actionable instruction for a coding agent to implement this phase. The instruction should:
1. Be specific and detailed
2. Include key files/components to create or modify
3. Specify any important technical decisions
4. Mention testing requirements
5. Be something a Claude Code CLI agent can execute

Return your response as a JSON object:
{
  "instruction": "Your detailed instruction here"
}

Return ONLY the JSON, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert software project planner. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      if (!result.instruction) {
        throw new Error('Invalid response format: missing instruction');
      }

      return result as PlanNextPhaseResult;
    } catch (error) {
      console.error('OpenAIPlanner.planNextPhase error:', error);
      throw new Error(`Failed to plan next phase: ${(error as Error).message}`);
    }
  }

  /**
   * Assess the result of a phase execution
   */
  async assessPhaseResult(params: AssessPhaseParams): Promise<AssessPhaseResult> {
    const { pso, phaseNumber, logs, errors } = params;
    const phase = pso.phases.find(p => p.number === phaseNumber);

    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found in PSO`);
    }

    const prompt = `You are an expert software project reviewer. Assess whether a development phase was completed successfully.

Phase Information:
- Phase ${phase.number}: ${phase.name}
- Description: ${phase.description || 'No description'}

Execution Logs:
${logs.substring(0, 2000)}${logs.length > 2000 ? '... (truncated)' : ''}

${errors ? `Errors:\n${errors.substring(0, 1000)}${errors.length > 1000 ? '... (truncated)' : ''}` : 'No errors reported'}

Your task:
Assess the phase execution and determine:
1. Was the phase completed successfully?
2. Are there any issues that need fixing?
3. Should we proceed to the next phase, retry, or require human input?
4. What should be done next?

Return your response as a JSON object:
{
  "status": "ok" | "needs_fix" | "stuck" | "human_input",
  "nextInstruction": "What to do next (if status is needs_fix)",
  "notes": "Your assessment and reasoning"
}

Status meanings:
- "ok": Phase completed successfully, can proceed to next phase
- "needs_fix": Minor issues, provide nextInstruction to fix
- "stuck": Major issues, might need different approach
- "human_input": Cannot proceed without human decision/input

Return ONLY the JSON, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert software project reviewer. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      if (!result.status) {
        throw new Error('Invalid response format: missing status');
      }

      // Validate status value
      const validStatuses = ['ok', 'needs_fix', 'stuck', 'human_input'];
      if (!validStatuses.includes(result.status)) {
        throw new Error(`Invalid status value: ${result.status}`);
      }

      return result as AssessPhaseResult;
    } catch (error) {
      console.error('OpenAIPlanner.assessPhaseResult error:', error);
      throw new Error(`Failed to assess phase result: ${(error as Error).message}`);
    }
  }
}
