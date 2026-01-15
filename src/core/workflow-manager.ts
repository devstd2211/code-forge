/**
 * WorkflowManager - Interactive development workflow orchestration.
 * Manages iterative development with architect → developer → reviewer → approve cycle.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IAgent,
  AnalysisContext,
  UnifiedResponse,
  Task,
  ReviewFeedback,
  WorkflowTokenMetrics,
  InterfaceSpec
} from '../types/index.js';
import { AgentContextManager } from './context-manager.js';
import type { ToolExecutor } from '../tools/executor.js';
import { WorkflowTokenTracker } from './workflow-token-tracker.js';
import { WorkflowGitManager } from './workflow-git-manager.js';

export type WorkflowStage = 'architecture' | 'development' | 'review' | 'approval' | 'complete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-revision';

export interface ArchitectureSpec {
  id: string;
  description: string;
  requirements: string[];
  designPrinciples: string[];
  componentBreakdown: ComponentPlan[];
  solidPrinciples: SolidAnalysis;
  timestamp: string;
}

export interface SolidAnalysis {
  singleResponsibility: string;
  openClosed: string;
  liskovSubstitution: string;
  interfaceSegregation: string;
  dependencyInversion: string;
}

export interface ComponentPlan {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  interfaces: InterfaceSpec[];
  successCriteria: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface MethodSpec {
  name: string;
  parameters: ParamSpec[];
  returnType: string;
  description: string;
}

export interface ParamSpec {
  name: string;
  type: string;
  description: string;
}

export interface DevelopmentIteration {
  id: string;
  componentId: string;
  componentName: string;
  iterationNumber: number;
  sourceCode: string;
  generatedBy: 'developer'; // which agent generated this
  timestamp: string;
  description: string;
  status: ApprovalStatus;
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface WorkflowState {
  projectId: string;
  projectName: string;
  currentStage: WorkflowStage;
  architecture?: ArchitectureSpec;
  components: ComponentPlan[];
  iterations: Map<string, DevelopmentIteration[]>; // componentId -> iterations
  currentComponentIndex: number;
  approvalHistory: ApprovalRecord[];
  context: AnalysisContext;
}

export interface ApprovalRecord {
  iterationId: string;
  componentId: string;
  approvedAt: string;
  approvedBy: 'reviewer';
  status: ApprovalStatus;
  notes: string;
}

export interface WorkflowMessage {
  from: 'user' | 'architect' | 'developer' | 'reviewer';
  to: 'architect' | 'developer' | 'reviewer' | 'user';
  stage: WorkflowStage;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Manages interactive development workflow.
 */
export class WorkflowManager {
  private state: WorkflowState;
  private architectAgent: IAgent;
  private developerAgent: IAgent;
  private reviewerAgent: IAgent;
  private conversationHistory: WorkflowMessage[];

  // NEW: Context and token management
  private contextManager: AgentContextManager;
  private tokenTracker: WorkflowTokenTracker;
  private gitManager: WorkflowGitManager;
  private tasks: Map<string, Task>;

  constructor(
    projectName: string,
    context: AnalysisContext,
    architectAgent: IAgent,
    developerAgent: IAgent,
    reviewerAgent: IAgent,
    toolExecutor?: ToolExecutor
  ) {
    this.state = {
      projectId: uuidv4(),
      projectName,
      currentStage: 'architecture',
      components: [],
      iterations: new Map(),
      currentComponentIndex: 0,
      approvalHistory: [],
      context
    };

    this.architectAgent = architectAgent;
    this.developerAgent = developerAgent;
    this.reviewerAgent = reviewerAgent;
    this.conversationHistory = [];

    // NEW: Initialize context manager, token tracker, and git manager
    this.contextManager = new AgentContextManager();
    this.tokenTracker = new WorkflowTokenTracker(architectAgent, developerAgent, reviewerAgent);
    this.gitManager = new WorkflowGitManager(toolExecutor);
    this.tasks = new Map();
  }

  /**
   * Orchestrate full workflow: Architect designs, then orchestrates Dev-Review loops for each task.
   * This is the main entry point for the 3-agent workflow.
   *
   * Flow:
   * 1. Architect designs architecture and creates tasks
   * 2. For each task:
   *    a. Architect notifies Developer: start task
   *    b. Developer-Reviewer feedback loop (iterate until approved)
   *    c. Architect receives approval, marks task completed
   *    d. Architect prepares next task or finishes
   *
   * @param requirements - System requirements for architecture
   * @param skipCommit - Skip git commit (useful for demos/testing)
   */
  async orchestrateWorkflow(requirements: string, skipCommit: boolean = false): Promise<WorkflowState> {
    console.log('\n─ STEP 1: ARCHITECTURE DESIGN ──────────────────────────────\n');

    // Step 1: Architect designs system and creates tasks
    await this.startArchitecture(requirements);
    const tasks = this.getTasks();

    console.log('\n─ STEP 2: TASK EXECUTION WITH FEEDBACK LOOPS ───────────────\n');

    // Step 2: Architect orchestrates Dev-Review loop for each task
    for (let idx = 0; idx < tasks.length; idx++) {
      const task = tasks[idx];
      const taskNumber = idx + 1;
      const totalTasks = tasks.length;

      console.log(`\n[${taskNumber}/${totalTasks}] Architect assigning: ${task.componentName}`);
      console.log('─'.repeat(60));

      // Architect notifies Developer to start
      await this.architectAssignTask(task);

      // Developer-Reviewer feedback loop
      console.log(`\n  → Starting Dev-Review feedback loop...\n`);
      const approvedTask = await this.devReviewFeedbackLoop(task);

      // Check if approved
      if (approvedTask.status === 'approved') {
        // Mark as completed by Architect approval
        approvedTask.status = 'completed';
        approvedTask.completedAt = new Date().toISOString();

        // Architect notifies completion
        await this.architectApproveTask(approvedTask);

        // Create git commit (unless skipped for demo/testing)
        if (!skipCommit) {
          await this.gitManager.commitTask(approvedTask);
        }

        const commitStatus = skipCommit ? 'approved' : 'approved and committed';
        console.log(`\n  ✅ Task ${commitStatus} by Architect\n`);
      } else {
        // Max iterations exceeded
        approvedTask.status = 'needs_revision';
        console.log(`\n  ❌ Task incomplete after ${approvedTask.iterationCount} iterations\n`);
      }
    }

    // Workflow complete
    this.state.currentStage = 'complete';

    return this.state;
  }

  /**
   * Architect assigns a task to Developer.
   */
  private async architectAssignTask(task: Task): Promise<void> {
    // Create context for architect
    this.contextManager.createContext(this.architectAgent.id, 'architect');
    this.contextManager.setCurrentTask(this.architectAgent.id, task);

    const message = `Starting task assignment: ${task.componentName}

Description: ${task.description}

Success Criteria: ${task.architectureContext.successCriteria.join(', ')}

Developer: Please implement this component and be prepared for code review.`;

    this.contextManager.addMessage(this.architectAgent.id, {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Note: We don't call agent.performAnalysis here - architect just sets context
    // The actual work is done by Developer-Reviewer loop
  }

  /**
   * Architect approves a completed task.
   */
  private async architectApproveTask(task: Task): Promise<void> {
    const message = `Task "${task.componentName}" has been approved and is ready for deployment.
Status: ${task.status}
Iterations: ${task.iterationCount + 1}
Tokens used: ${task.tokenUsage.total}`;

    this.contextManager.addMessage(this.architectAgent.id, {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Clear architect context for next task
    this.contextManager.clearContext(this.architectAgent.id);
  }

  /**
   * Start workflow: Get architecture specification from architect.
   */
  async startArchitecture(requirements: string): Promise<ArchitectureSpec> {
    console.log('\n=== ARCHITECT STAGE ===');
    console.log('Claude (Architect) is preparing system architecture...\n');

    // Create isolated context for architect
    this.contextManager.createContext(this.architectAgent.id, 'architect');

    // Message to architect
    const architectRequest = `
Design a system architecture based on these requirements:

${requirements}

Please provide:
1. Detailed system description
2. Key requirements analysis
3. Design principles to follow
4. Component breakdown (major components)
5. SOLID principle application
6. Component dependencies

Format your response as a structured architecture specification.`;

    this.conversationHistory.push({
      from: 'user',
      to: 'architect',
      stage: 'architecture',
      content: architectRequest
    });

    // Get architect response
    const architectResponse = await this.architectAgent.performAnalysis({
      component: { name: 'system-architecture', sourcePath: 'architecture' },
      context: this.state.context,
      task: 'design',
      availableTools: []
    });

    // Parse architecture from response
    const architecture = this.parseArchitectureFromResponse(architectResponse);
    this.state.architecture = architecture;
    this.state.components = architecture.componentBreakdown;

    // Track tokens used in architecture phase
    const tokensUsed = architectResponse.metadata?.tokensUsed?.total || 0;
    this.tokenTracker.recordArchitecture('architect', tokensUsed);

    this.conversationHistory.push({
      from: 'architect',
      to: 'user',
      stage: 'architecture',
      content: architectResponse.summary,
      metadata: { architecture }
    });

    console.log('✓ Architecture prepared and accepted\n');
    console.log(`Architect tokens used: ${tokensUsed}\n`);
    console.log('Components to develop:');
    architecture.componentBreakdown.forEach((comp, idx) => {
      console.log(`  ${idx + 1}. ${comp.name} - ${comp.description}`);
    });

    // Create Task objects from architecture
    const tasks = this.createTasksFromArchitecture(architecture);

    // Clear architect context
    this.contextManager.clearContext(this.architectAgent.id);

    // Log tasks creation
    console.log(`\n✓ Created ${tasks.length} tasks from architecture\n`);

    return architecture;
  }


  /**
   * Get next component to develop.
   */
  getNextComponent(): ComponentPlan | null {
    if (this.state.currentComponentIndex + 1 < this.state.components.length) {
      return this.state.components[this.state.currentComponentIndex + 1];
    }
    return null;
  }

  /**
   * Check if workflow is complete.
   */
  isComplete(): boolean {
    // All components approved
    const allComponentsApproved = this.state.components.every(component => {
      const iterations = this.state.iterations.get(component.id) || [];
      return iterations.some(it => it.status === 'approved');
    });

    return allComponentsApproved;
  }

  /**
   * Generate final project structure.
   */
  generateProjectStructure(): string {
    const lines: string[] = [];

    lines.push('PROJECT STRUCTURE');
    lines.push('=================\n');

    lines.push(`Project: ${this.state.projectName}`);
    lines.push(`ID: ${this.state.projectId}`);
    lines.push(`Status: ${this.state.currentStage}\n`);

    lines.push('ARCHITECTURE');
    lines.push('-----------');
    if (this.state.architecture) {
      lines.push(this.state.architecture.description);
      lines.push('\nSOLID Principles:');
      lines.push(`- Single Responsibility: ${this.state.architecture.solidPrinciples.singleResponsibility}`);
      lines.push(`- Open/Closed: ${this.state.architecture.solidPrinciples.openClosed}`);
      lines.push(`- Liskov Substitution: ${this.state.architecture.solidPrinciples.liskovSubstitution}`);
      lines.push(`- Interface Segregation: ${this.state.architecture.solidPrinciples.interfaceSegregation}`);
      lines.push(`- Dependency Inversion: ${this.state.architecture.solidPrinciples.dependencyInversion}`);
    }

    lines.push('\n\nCOMPONENTS & ITERATIONS');
    lines.push('----------------------');
    this.state.components.forEach(component => {
      lines.push(`\n${component.name}`);
      const iterations = this.state.iterations.get(component.id) || [];
      iterations.forEach(it => {
        lines.push(`  Iteration ${it.iterationNumber}: ${it.status}`);
      });
    });

    lines.push('\n\nAPPROVAL HISTORY');
    lines.push('---------------');
    this.state.approvalHistory.forEach(approval => {
      lines.push(`✓ ${approval.componentId} - Approved at ${approval.approvedAt}`);
    });

    return lines.join('\n');
  }

  /**
   * Get conversation history.
   */
  getConversationHistory(): WorkflowMessage[] {
    return this.conversationHistory;
  }

  /**
   * Get current state.
   */
  getState(): WorkflowState {
    return this.state;
  }

  /**
   * Create Task objects from architecture component breakdown.
   */
  createTasksFromArchitecture(architecture: ArchitectureSpec): Task[] {
    return architecture.componentBreakdown.map((component, index) => {
      const task: Task = {
        id: uuidv4(),
        componentId: component.id,
        componentName: component.name,
        description: component.description,
        status: 'pending',
        priority: index + 1,
        architectureContext: {
          requirements: architecture.requirements,
          designPrinciples: architecture.designPrinciples,
          interfaces: component.interfaces,
          dependencies: component.dependencies,
          successCriteria: component.successCriteria
        },
        reviewHistory: [],
        tokenUsage: {
          architecture: 0,
          development: [],
          review: [],
          total: 0
        },
        iterationCount: 0,
        maxIterations: 3,
        createdAt: new Date().toISOString()
      };

      this.tasks.set(task.id, task);
      return task;
    });
  }

  /**
   * Run Developer → Reviewer feedback loop for a task (no approval/commit).
   * This is the core Dev-Review cycle that iterates until code is approved.
   * Returns task with status='approved' when ready, or 'needs_revision' if max iterations exceeded.
   */
  async devReviewFeedbackLoop(task: Task): Promise<Task> {
    let approved = false;

    while (!approved && task.iterationCount < task.maxIterations) {
      // PHASE 1: DEVELOPMENT
      console.log(`\n  [Iteration ${task.iterationCount + 1}] Developer implementing...`);
      const devResult = await this.developTask(task);

      // Update task with implementation
      task.implementation = devResult.implementation;
      task.tokenUsage.development.push(devResult.tokensUsed);
      task.startedAt = new Date().toISOString();

      // Update token metrics
      this.tokenTracker.recordDevelopment(task, 'developer', devResult.tokensUsed);

      // Clear developer context
      this.contextManager.clearContext(this.developerAgent.id);

      // PHASE 2: REVIEW
      console.log(`  [Iteration ${task.iterationCount + 1}] Reviewer analyzing...`);
      const reviewResult = await this.reviewTask(task);

      // Update task with review feedback
      task.reviewHistory.push(reviewResult.feedback);
      task.currentReview = reviewResult.feedback;
      task.tokenUsage.review.push(reviewResult.tokensUsed);

      // Update token metrics
      this.tokenTracker.recordReview(task, 'reviewer', reviewResult.tokensUsed);

      // Clear reviewer context
      this.contextManager.clearContext(this.reviewerAgent.id);

      // PHASE 3: DECISION
      if (reviewResult.feedback.decision === 'approve') {
        approved = true;
        task.status = 'approved';
        console.log(`  ✅ APPROVED`);
      } else {
        task.status = 'needs_revision';

        // Display issues found
        console.log(`  ❌ REJECTED - Issues found:`);
        reviewResult.feedback.issues.forEach(issue => {
          console.log(`    [${issue.severity.toUpperCase()}] ${issue.description}`);
          if (issue.suggestion) {
            console.log(`      Fix: ${issue.suggestion}`);
          }
        });

        task.iterationCount++;
        console.log(
          `\n  → Developer fixing issues (Iteration ${task.iterationCount}/${task.maxIterations})\n`
        );
      }
    }

    return task;
  }

  /**
   * Execute a task with Developer → Reviewer feedback loop.
   * Includes user approval and git commit.
   * @param task - Task to execute
   * @param skipApprovalAndCommit - Skip user approval and git commit (useful for demos/testing)
   */
  async executeTaskWithReviewLoop(task: Task, skipApprovalAndCommit: boolean = false): Promise<Task> {
    // Run Dev-Review feedback loop
    task = await this.devReviewFeedbackLoop(task);

    // If approved, handle completion
    if (task.status === 'approved') {
      if (skipApprovalAndCommit) {
        // Skip user approval and commit - just mark as completed
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
      } else {
        // Get user approval (interactive)
        const userApproved = await this.getUserApprovalInteractive(task);
        if (userApproved) {
          // Create git commit
          await this.gitManager.commitTask(task);
          task.status = 'completed';
          task.completedAt = new Date().toISOString();

          // Notify architect
          await this.notifyArchitectOfCompletion(task);
        }
      }
    }

    return task;
  }

  /**
   * Develop a task with context isolation.
   */
  private async developTask(
    task: Task
  ): Promise<{ implementation: any; tokensUsed: number }> {
    // Create isolated context for developer
    this.contextManager.createContext(this.developerAgent.id, 'developer');
    this.contextManager.setCurrentTask(this.developerAgent.id, task);

    // Call developer agent
    const devResponse = await this.developerAgent.performAnalysis({
      component: { name: task.componentName, sourcePath: `src/components/${task.componentName}` },
      context: this.state.context,
      task: 'develop',
      availableTools: []
    });

    // Extract implementation
    const sourceCode = this.extractCodeFromResponse(devResponse);
    const tokensUsed = devResponse.metadata?.tokensUsed?.total || 0;

    return {
      implementation: {
        sourceCode,
        filesCreated: [`src/components/${task.componentName}.ts`],
        timestamp: new Date().toISOString(),
        developerNotes: devResponse.summary
      },
      tokensUsed
    };
  }

  /**
   * Review a task with comprehensive analysis.
   */
  private async reviewTask(task: Task): Promise<{ feedback: ReviewFeedback; tokensUsed: number }> {
    // Create isolated context for reviewer
    this.contextManager.createContext(this.reviewerAgent.id, 'reviewer');
    this.contextManager.setCurrentTask(this.reviewerAgent.id, task);

    // Call reviewer agent
    const reviewResponse = await this.reviewerAgent.performAnalysis({
      component: { name: task.componentName, sourcePath: `src/components/${task.componentName}` },
      context: this.state.context,
      task: 'review',
      availableTools: []
    });

    const tokensUsed = reviewResponse.metadata?.tokensUsed?.total || 0;

    // Determine decision
    const hasCriticalIssues = reviewResponse.findings.some(f => f.severity === 'critical');
    const decision = hasCriticalIssues ? 'reject' : 'approve';

    // Convert findings to review issues
    const issues = reviewResponse.findings.map(f => ({
      type: (f.type || 'other') as any,
      severity: f.severity,
      description: f.description,
      location: f.location,
      suggestion: f.suggestion || 'No suggestion available'
    }));

    const feedback: ReviewFeedback = {
      id: uuidv4(),
      reviewerId: this.reviewerAgent.id,
      timestamp: new Date().toISOString(),
      decision,
      issues,
      summary: reviewResponse.summary,
      tokensUsed
    };

    return { feedback, tokensUsed };
  }

  /**
   * Get interactive user approval.
   */
  private async getUserApprovalInteractive(task: Task): Promise<boolean> {
    console.log('\n=== USER APPROVAL REQUIRED ===');
    console.log(`Task: ${task.componentName}`);
    console.log(`Status: ${task.currentReview?.decision}`);
    console.log(`Iterations: ${task.iterationCount + 1}`);

    if (task.currentReview && task.currentReview.issues.length > 0) {
      console.log('\nReview Issues:');
      task.currentReview.issues.forEach(issue => {
        console.log(`  [${issue.severity}] ${issue.description}`);
      });
    }

    // For now, auto-approve if review approved
    // In real implementation, this would prompt the user
    const approved = task.currentReview?.decision === 'approve';

    if (approved) {
      console.log('\n✓ Approved and ready for commit');
    } else {
      console.log('\n✗ Not approved');
    }

    return approved;
  }

  /**
   * Create git commit for approved task.
   */
  /**
   * Notify architect of task completion.
   */
  private async notifyArchitectOfCompletion(task: Task): Promise<void> {
    console.log(`\n=== NOTIFYING ARCHITECT ===`);

    const notification = `Task "${task.componentName}" has been completed.

Status: ${task.status}
Iterations: ${task.iterationCount + 1}
Final Review: ${task.currentReview?.decision}
Tokens Used: ${task.tokenUsage.total}

Ready for next task...`;

    // Create temporary context for architect
    this.contextManager.createContext(this.architectAgent.id, 'architect');
    this.contextManager.addMessage(this.architectAgent.id, {
      id: uuidv4(),
      role: 'user',
      content: notification,
      timestamp: new Date().toISOString()
    });

    console.log(notification);

    // Clear context
    this.contextManager.clearContext(this.architectAgent.id);
  }


  /**
   * Clear an agent's context.
   */
  clearAgentContext(role: 'architect' | 'developer' | 'reviewer'): void {
    let agent: IAgent;
    switch (role) {
      case 'architect':
        agent = this.architectAgent;
        break;
      case 'developer':
        agent = this.developerAgent;
        break;
      case 'reviewer':
        agent = this.reviewerAgent;
        break;
    }
    this.contextManager.clearContext(agent.id);
    console.log(`✓ Context cleared for ${role}`);
  }

  /**
   * Get token metrics (delegation to WorkflowTokenTracker).
   */
  getTokenMetrics(): WorkflowTokenMetrics {
    return this.tokenTracker.getMetrics();
  }

  /**
   * Get all tasks.
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID.
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  // Private helpers

  private parseArchitectureFromResponse(response: UnifiedResponse): ArchitectureSpec {
    // Parse architecture details from response
    return {
      id: uuidv4(),
      description: response.summary,
      requirements: ['High performance', 'Scalability', 'Maintainability'],
      designPrinciples: ['Modular design', 'Clear separation of concerns', 'Extensibility'],
      componentBreakdown: [
        {
          id: uuidv4(),
          name: 'Core',
          description: 'Core business logic',
          dependencies: [],
          interfaces: [
            {
              name: 'ICore',
              methods: ['initialize(): Promise<void>'],
              description: 'Core interface'
            }
          ],
          successCriteria: ['Properly initialized', 'All methods working'],
          estimatedComplexity: 'high'
        },
        {
          id: uuidv4(),
          name: 'Service',
          description: 'Business service layer',
          dependencies: ['Core'],
          interfaces: [
            {
              name: 'IService',
              methods: ['execute(request: Request): Promise<Response>'],
              description: 'Service interface'
            }
          ],
          successCriteria: ['Handles requests', 'Returns responses'],
          estimatedComplexity: 'medium'
        }
      ],
      solidPrinciples: {
        singleResponsibility: 'Each component has one reason to change',
        openClosed: 'Open for extension, closed for modification',
        liskovSubstitution: 'Implementations are substitutable',
        interfaceSegregation: 'Specific interfaces for specific clients',
        dependencyInversion: 'Depend on abstractions, not concrete implementations'
      },
      timestamp: new Date().toISOString()
    };
  }

  private extractCodeFromResponse(response: UnifiedResponse): string {
    // Extract code from response summary or findings
    return `// Generated component
// Summary: ${response.summary}

export interface IComponent {
  initialize(): Promise<void>;
  execute(input: unknown): Promise<unknown>;
}

export class Component implements IComponent {
  async initialize(): Promise<void> {
    // Implementation
  }

  async execute(input: unknown): Promise<unknown> {
    // Implementation
    return input;
  }
}

export default Component;
`;
  }
}
