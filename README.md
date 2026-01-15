## 🚧 Work in Progress
This CLI orchestrates three AI agents (Architect, Developer, Reviewer).
Currently *untested with real API calls*. Requires funded API keys.

# Code Forge — CLI that orchestrates multiple LLM agents (Architect, Developer, Reviewer) to build production-ready code.

**AI-powered code analysis and development system using Claude/OpenAI/Deepseek LLM.**

CodeForge is a command-line tool for code analysis and development using Large Language Models (LLM). It automates code reviews, architectural design, and component generation through an interactive workflow with roles: Architect, Developer, Reviewer.

![CodeForge Logo](public/logo.png)

## ❓ What is LLM?

**LLM (Large Language Model)** - AI neural network models that understand and generate text. CodeForge uses **Claude/OpenAI/Deepseek** for:
- Code analysis and review
- System architecture design
- Automatic TypeScript code generation
- Quality and security checks

## 🎯 Two Modes

### REVIEW - Code Analysis
```bash
npm run dev -- review src/api.ts
```
Check code quality, security, and architecture.

### DEVELOP - Interactive Development
```bash
npm run dev -- develop monitoring-system \
  --requirements "Monitoring system for 1000+ hosts"
```
Automatic component creation: Architect → Developer → Reviewer → Approval.

---

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
```bash
# Copy example
cp .env.example .env

# Add Claude API key
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run
```bash
npm run dev -- review src/app.ts
npm run dev -- develop my-project --requirements "Your requirements"
```

### 4. Build for Production
```bash
npm run build
```

---

## ⚙️ Configuration

CodeForge looks for `config.json` in these locations (priority order):
1. Current directory: `./config.json`
2. User home: `~/.codeforge/config.json`

Example config files are provided:
- `config.example.json` - Simple mode configuration
- `config.advanced.example.json` - Advanced mode with all three models

### Simple Mode: `config.json`
```json
{
  "mode": "simple",
  "roles": {
    "model": "claude",
    "modelType": "claude-sonnet-4-5",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "tools": {
    "enabled": ["read_file", "write_file", "test_runner", "code_search"],
    "securityRules": {
      "allowedPaths": ["./src", "./tests", "./"],
      "forbiddenPaths": ["./.git", "./node_modules"]
    }
  },
  "apiKeys": {
    "claude": "sk-ant-..."
  }
}
```

### Advanced Mode: `config.json`
```json
{
  "mode": "advanced",
  "roles": {
    "architect": {
      "model": "claude",
      "modelType": "claude-opus-4-1",
      "temperature": 0.5,
      "maxTokens": 4096
    },
    "developer": {
      "model": "gpt",
      "modelType": "gpt-4-turbo",
      "temperature": 0.7,
      "maxTokens": 4096
    },
    "reviewer": {
      "model": "deepseek",
      "modelType": "deepseek-chat",
      "temperature": 0.3,
      "maxTokens": 2048
    }
  },
  "tools": {
    "enabled": ["read_file", "write_file", "test_runner", "code_search"],
    "securityRules": {
      "allowedPaths": ["./src", "./tests", "./"],
      "forbiddenPaths": ["./.git", "./node_modules"]
    }
  },
  "apiKeys": {
    "claude": "sk-ant-...",
    "openai": "sk-...",
    "deepseek": "sk-..."
  }
}
```

### Environment Variables (.env)
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
LOG_LEVEL=info              # debug, info, warn, error
EDISON_MODE=advanced         # simple, advanced
```

**Note:** The config file in the root directory should not be committed to git. Use the example files (`config.example.json`, `config.advanced.example.json`) as templates.

---

## 📋 Command Examples

```bash
# Simple code review
npm run dev -- review src/handler.ts

# Advanced review (all roles)
npm run dev -- review src/api.ts --mode advanced

# Development with requirements
npm run dev -- develop payment-system \
  --requirements "Payment processing API"

# Output as Markdown
npm run dev -- review src/app.ts --format markdown --output analysis.md

# Development mode with verbose logs
npm run dev -- develop service --requirements "..." --verbose
```

---

## 🧪 Testing

```bash
npm test              # Run tests
npm test -- --watch   # Watch mode
npm run type-check    # Type checking
```

---

## 📝 Project Structure

```
src/
├── cli/              # Command-line interface
├── models/           # LLM adapters (Claude, GPT, DeepSeek)
├── agents/           # Roles: Architect, Developer, Reviewer
├── config/           # Configuration loading
├── tools/            # Tools (read_file, write_file, etc.)
└── core/             # Core logic
```

---

## ❓ How to Run as Global Command (`codeforge`)?

To run `codeforge` instead of `npm run dev --`:

### Method 1: npm install -g (Recommended)
```bash
# In project folder
npm install -g .

# Now use anywhere:
codeforge review src/app.ts
codeforge develop system --requirements "..."
```

### Method 2: Add bin to package.json
Edit `package.json`:
```json
{
  "name": "edison-cli",
  "bin": {
    "codeforge": "./dist/cli/cli.js"
  }
}
```

Then:
```bash
npm install -g .
codeforge review src/app.ts
```

### Method 3: Create alias
```bash
# In .bashrc or .zshrc:
alias codeforge="npm run dev --"

# Reload shell
source ~/.bashrc
```

**I recommend Method 1** - the cleanest and most professional approach.

---

## 📄 License

MIT

---

Made for developers who care about code quality.
