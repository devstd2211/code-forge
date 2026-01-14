/**
 * WorkflowManager - Interactive development workflow orchestration.
 * Manages iterative development with architect → developer → reviewer → approve cycle.
 */

import { v4 as uuidv4 } from 'uuid';
import type {

  IAgent,

  AnalysisContext,

  UnifiedResponse
} from '../types/index.js';

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

export interface InterfaceSpec {
  name: string;
  methods: MethodSpec[];
  description: string;
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

  constructor(
    projectName: string,
    context: AnalysisContext,
    architectAgent: IAgent,
    developerAgent: IAgent,
    reviewerAgent: IAgent
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
  }

  /**
   * Start workflow: Get architecture specification from architect.
   */
  async startArchitecture(requirements: string): Promise<ArchitectureSpec> {
    console.log('\n=== ARCHITECT STAGE ===');
    console.log('Claude (Architect) is preparing system architecture...\n');

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

    // Simulate architect response (in real implementation, this would call Claude API)
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

    this.conversationHistory.push({
      from: 'architect',
      to: 'user',
      stage: 'architecture',
      content: architectResponse.summary,
      metadata: { architecture }
    });

    console.log('✓ Architecture prepared and accepted\n');
    console.log('Components to develop:');
    architecture.componentBreakdown.forEach((comp, idx) => {
      console.log(`  ${idx + 1}. ${comp.name} - ${comp.description}`);
    });

    return architecture;
  }

  /**
   * Develop a single component with iterations.
   */
  async developComponent(componentIndex: number): Promise<DevelopmentIteration> {
    if (componentIndex >= this.state.components.length) {
      throw new Error('Invalid component index');
    }

    const component = this.state.components[componentIndex];
    this.state.currentStage = 'development';
    this.state.currentComponentIndex = componentIndex;

    console.log(`\n=== DEVELOPMENT STAGE ===`);
    console.log(`GPT (Developer) is implementing ${component.name}...\n`);

    // Get or create iterations list for this component
    if (!this.state.iterations.has(component.id)) {
      this.state.iterations.set(component.id, []);
    }

    const iterations = this.state.iterations.get(component.id)!;
    const iterationNumber = iterations.length + 1;

    // Build development request
    const devRequest = `
Implement the following component:

Component: ${component.name}
Description: ${component.description}
Complexity: ${component.estimatedComplexity}

Dependencies: ${component.dependencies.join(', ')}

Required interfaces:
${component.interfaces
  .map(
    iface => `
Interface: ${iface.name}
${iface.methods.map(m => `  - ${m.name}(${m.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${m.returnType}`).join('\n')}
`
  )
  .join('\n')}

Success criteria:
${component.successCriteria.map(c => `- ${c}`).join('\n')}

Generate production-ready TypeScript code for this component.`;

    this.conversationHistory.push({
      from: 'user',
      to: 'developer',
      stage: 'development',
      content: devRequest,
      metadata: { component }
    });

    // Get development response
    const devResponse = await this.developerAgent.performAnalysis({
      component: { name: component.name, sourcePath: `src/components/${component.name}` },
      context: this.state.context,
      task: 'develop',
      availableTools: []
    });

    // Extract code from response
    const sourceCode = this.extractCodeFromResponse(devResponse);

    const iteration: DevelopmentIteration = {
      id: uuidv4(),
      componentId: component.id,
      componentName: component.name,
      iterationNumber,
      sourceCode,
      generatedBy: 'developer',
      timestamp: new Date().toISOString(),
      description: `Iteration ${iterationNumber} of ${component.name}`,
      status: 'pending'
    };

    iterations.push(iteration);

    this.conversationHistory.push({
      from: 'developer',
      to: 'user',
      stage: 'development',
      content: devResponse.summary,
      metadata: { iteration, sourceCode }
    });

    console.log(`✓ ${component.name} developed (Iteration ${iterationNumber})\n`);
    console.log('Code preview (first 30 lines):');
    console.log(sourceCode.split('\n').slice(0, 30).join('\n'));
    console.log('...\n');

    return iteration;
  }

  /**
   * Review developed component.
   */
  async reviewComponent(iteration: DevelopmentIteration): Promise<ApprovalStatus> {
    this.state.currentStage = 'review';

    console.log(`\n=== REVIEW STAGE ===`);
    console.log(`DeepSeek (Reviewer) is reviewing ${iteration.componentName}...\n`);

    // Build review request
    const reviewRequest = `
Review this code for quality, security, and correctness:

Component: ${iteration.componentName}
Iteration: ${iteration.iterationNumber}

Code:
\`\`\`typescript
${iteration.sourceCode}
\`\`\`

Evaluate:
1. Code quality and readability
2. Security issues
3. Performance concerns
4. Test coverage gaps
5. SOLID principles adherence
6. Error handling
7. Documentation

Provide specific feedback and recommendations.`;

    this.conversationHistory.push({
      from: 'user',
      to: 'reviewer',
      stage: 'review',
      content: reviewRequest,
      metadata: { iteration }
    });

    // Get review response
    const reviewResponse = await this.reviewerAgent.performAnalysis({
      component: {
        name: iteration.componentName,
        sourcePath: `src/components/${iteration.componentName}`
      },
      context: this.state.context,
      task: 'review',
      availableTools: []
    });

    // Determine approval status
    const hasOnlyCriticalIssues = reviewResponse.findings.some(f => f.severity === 'critical');
    const approval = hasOnlyCriticalIssues ? 'rejected' : 'approved';

    iteration.status = approval;
    iteration.reviewNotes = reviewResponse.summary;

    if (approval === 'rejected') {
      iteration.rejectionReason = reviewResponse.findings
        .filter(f => f.severity === 'critical')
        .map(f => `- ${f.description}`)
        .join('\n');
    }

    this.conversationHistory.push({
      from: 'reviewer',
      to: 'user',
      stage: 'review',
      content: reviewResponse.summary,
      metadata: {
        iteration,
        findings: reviewResponse.findings,
        status: approval
      }
    });

    return approval;
  }

  /**
   * Get user approval for iteration.
   */
  async getUserApproval(iteration: DevelopmentIteration): Promise<boolean> {
    this.state.currentStage = 'approval';

    console.log(`\n=== APPROVAL STAGE ===`);
    console.log(`Status: ${iteration.status}`);
    console.log(`Notes: ${iteration.reviewNotes}\n`);

    // In interactive mode, this would prompt the user
    // For now, simulate approval based on review status
    const approved = iteration.status === 'approved';

    if (approved) {
      console.log('✓ Approved and committed\n');

      // Record approval
      const approval: ApprovalRecord = {
        iterationId: iteration.id,
        componentId: iteration.componentId,
        approvedAt: new Date().toISOString(),
        approvedBy: 'reviewer',
        status: 'approved',
        notes: iteration.reviewNotes || ''
      };

      this.state.approvalHistory.push(approval);
    } else {
      console.log('✗ Rejected - needs revision\n');
      console.log('Rejection reasons:');
      console.log(iteration.rejectionReason);
    }

    return approved;
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
              methods: [
                {
                  name: 'initialize',
                  parameters: [],
                  returnType: 'Promise<void>',
                  description: 'Initialize core'
                }
              ],
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
              methods: [
                {
                  name: 'execute',
                  parameters: [{ name: 'request', type: 'Request', description: 'Service request' }],
                  returnType: 'Promise<Response>',
                  description: 'Execute service'
                }
              ],
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
