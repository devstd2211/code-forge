# CodeForge Samples

Sample workflows demonstrating CodeForge's multi-agent architecture.

## Hello World Go Workflow

A complete demonstration of the CodeForge workflow with mock models.

### What it demonstrates:

1. **Architecture Phase**: Architect designs a Go "Hello World" application
2. **Development Phase (Iteration 1)**: Developer implements code with an intentional error
3. **Review Phase (Iteration 1)**: Reviewer finds the division-by-zero error
4. **Development Phase (Iteration 2)**: Developer fixes the error
5. **Review Phase (Iteration 2)**: Reviewer approves the fixed code
6. **Token Tracking**: Complete token usage and cost estimation

### How to run:

```bash
# Using ts-node directly
npx ts-node samples/hello-world-go-workflow.ts

# Or build first, then run
npm run build
npx ts-node dist/samples/hello-world-go-workflow.js
```

### Key Features Demonstrated:

- ✅ Three-agent collaboration (Architect → Developer → Reviewer)
- ✅ Iterative development with error detection
- ✅ Automatic error fixing based on reviewer feedback
- ✅ Context isolation between agent interactions
- ✅ Token counting and cost estimation
- ✅ Complete workflow state tracking

### Mock Models:

The sample uses mock adapters that simulate API responses:

- **MockClaudeAdapter**: Simulates Claude (Architect role)
- **MockGPTAdapter**: Simulates GPT (Developer role)
- **MockDeepSeekAdapter**: Simulates DeepSeek (Reviewer role)

Mock responses are predefined to:
1. First review reveals division-by-zero error
2. Developer fixes the error in second iteration
3. Second review approves the fixed code

### Output:

The sample produces detailed output showing:

```
Token Usage Summary:
  Architect:  350 tokens
  Developer:  1400 tokens (2 iterations)
  Reviewer:   1750 tokens (2 reviews)
  Total:      3500 tokens

Estimated Cost:
  Total: $0.0470
```

## Adding Your Own Samples

To create additional samples:

1. Create a new TypeScript file in `samples/`
2. Use the mock adapters for testing
3. Or use real adapters with API keys
4. Export a main function that demonstrates the workflow

Example structure:

```typescript
import { MockClaudeAdapter } from '../src/models/adapters/mock-claude-adapter.js';
import { WorkflowManager } from '../src/core/workflow-manager.js';

async function runMyWorkflow() {
  // Create models and workflow
  // Execute and demonstrate
}

runMyWorkflow().catch(console.error);
```
