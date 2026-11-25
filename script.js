// ==========================================
// 1. PRESET PROGRAMS (Python, C, Java)
// ==========================================
const PRESETS = {
  python: {
    factorial: `# Compute Factorial of 5
n = 5
fact = 1
i = 1
while i <= n:
    fact = fact * i
    i = i + 1
print("Factorial result:")
print(fact)`,
    fibonacci: `# First 7 Fibonacci numbers
a = 0
b = 1
count = 0
while count < 7:
    print(a)
    temp = a + b
    a = b
    b = temp
    count = count + 1`,
    conditionals: `# Grade Evaluator
score = 84
if score >= 90:
    print("Grade: A")
else:
    if score >= 75:
        print("Grade: B")
    else:
        print("Grade: C")`,
    error_demo: `# Division by zero / Undefined variable demo
x = 10
y = 0
print(x / y)`
  },
  c: {
    factorial: `#include <stdio.h>

int main() {
    int n = 5;
    int fact = 1;
    for (int i = 1; i <= n; i = i + 1) {
        fact = fact * i;
    }
    printf("Factorial result:");
    printf(fact);
    return 0;
}`,
    fibonacci: `#include <stdio.h>

int main() {
    int a = 0;
    int b = 1;
    int count = 0;
    while (count < 7) {
        printf(a);
        int temp = a + b;
        a = b;
        b = temp;
        count = count + 1;
    }
    return 0;
}`,
    conditionals: `#include <stdio.h>

int main() {
    int score = 84;
    if (score >= 90) {
        printf("Grade: A");
    } else {
        if (score >= 75) {
            printf("Grade: B");
        } else {
            printf("Grade: C");
        }
    }
    return 0;
}`,
    error_demo: `#include <stdio.h>

int main() {
    int a = 25;
    int b = 0;
    printf(a / b);
    return 0;
}`
  },
  java: {
    factorial: `public class Main {
    public static void main(String[] args) {
        int n = 5;
        int fact = 1;
        for (int i = 1; i <= n; i = i + 1) {
            fact = fact * i;
        }
        System.out.println("Factorial result:");
        System.out.println(fact);
    }
}`,
    fibonacci: `public class Main {
    public static void main(String[] args) {
        int a = 0;
        int b = 1;
        int count = 0;
        while (count < 7) {
            System.out.println(a);
            int temp = a + b;
            a = b;
            b = temp;
            count = count + 1;
        }
    }
}`,
    conditionals: `public class Main {
    public static void main(String[] args) {
        int score = 84;
        if (score >= 90) {
            System.out.println("Grade: A");
        } else {
            if (score >= 75) {
                System.out.println("Grade: B");
            } else {
                System.out.println("Grade: C");
            }
        }
    }
}`,
    error_demo: `public class Main {
    public static void main(String[] args) {
        int x = 42;
        System.out.println(unknownVar + x);
    }
}`
  }
};

// ==========================================
// 2. LEXER (TOKENIZER)
// ==========================================
class CompilerError extends Error {
  constructor(stage, message, line) {
    super(`[${stage} Error] Line ${line}: ${message}`);
    this.stage = stage;
    this.line = line;
  }
}

function tokenize(source, lang) {
  const tokens = [];
  const lines = source.split('\n');
  const indentStack = [0];

  const keywords = new Set([
    'if', 'else', 'while', 'for', 'return',
    'int', 'float', 'double', 'String', 'boolean', 'void',
    'public', 'class', 'static', 'main', 'true', 'false', 'print', 'printf'
  ]);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    let rawLine = lines[lineIdx];

    // Strip C/Java preprocessor & single-line comments
    if (lang !== 'python' && rawLine.trim().startsWith('#')) continue;
    const commentIdx = lang === 'python' ? rawLine.indexOf('#') : rawLine.indexOf('//');
    if (commentIdx !== -1) rawLine = rawLine.slice(0, commentIdx);

    if (rawLine.trim().length === 0) continue;

    // Handle Python indentation
    if (lang === 'python') {
      const leadingSpaces = rawLine.match(/^ */)[0].length;
      if (leadingSpaces > indentStack[indentStack.length - 1]) {
        indentStack.push(leadingSpaces);
        tokens.push({ type: 'INDENT', value: 'INDENT', line: lineNum });
      } else {
        while (leadingSpaces < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          tokens.push({ type: 'DEDENT', value: 'DEDENT', line: lineNum });
        }
        if (leadingSpaces !== indentStack[indentStack.length - 1]) {
          throw new CompilerError('Lexer', 'Inconsistent indentation level', lineNum);
        }
      }
    }

    let i = 0;
    while (i < rawLine.length) {
      const ch = rawLine[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // String literals
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = '';
        i++;
        while (i < rawLine.length && rawLine[i] !== quote) {
          str += rawLine[i++];
        }
        if (rawLine[i] !== quote) {
          throw new CompilerError('Lexer', 'Unterminated string literal', lineNum);
        }
        i++;
        tokens.push({ type: 'STRING', value: str, line: lineNum });
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch)) {
        let numStr = '';
        while (i < rawLine.length && /[0-9.]/.test(rawLine[i])) {
          numStr += rawLine[i++];
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr), line: lineNum });
        continue;
      }

      // Identifiers & Dotted Java calls (System.out.println)
      if (/[a-zA-Z_]/.test(ch)) {
        let ident = '';
        while (i < rawLine.length && /[a-zA-Z0-9_.]/.test(rawLine[i])) {
          ident += rawLine[i++];
        }
        if (ident === 'true' || ident === 'false') {
          tokens.push({ type: 'BOOL', value: ident === 'true', line: lineNum });
        } else if (keywords.has(ident) || ident === 'System.out.println' || ident === 'System.out.print') {
          tokens.push({ type: 'KEYWORD', value: ident, line: lineNum });
        } else {
          tokens.push({ type: 'IDENT', value: ident, line: lineNum });
        }
        continue;
      }

      // Multi-char operators
      const twoChar = rawLine.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--'].includes(twoChar)) {
        tokens.push({ type: 'OP', value: twoChar, line: lineNum });
        i += 2;
        continue;
      }

      // Single-char operators & punctuation
      if ('+-*/%=<>!(){}[];,:'.includes(ch)) {
        tokens.push({ type: 'PUNCT', value: ch, line: lineNum });
        i++;
        continue;
      }

      throw new CompilerError('Lexer', `Unexpected character '${ch}'`, lineNum);
    }

    if (lang === 'python') {
      tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum });
    }
  }

  if (lang === 'python') {
    const lastLine = lines.length;
    while (indentStack.length > 1) {
      indentStack.pop();
      tokens.push({ type: 'DEDENT', value: 'DEDENT', line: lastLine });
    }
  }

  tokens.push({ type: 'EOF', value: 'EOF', line: lines.length });
  return tokens;
}

// ==========================================
// 3. PARSER & BYTECODE COMPILER
// ==========================================
class Compiler {
  constructor(tokens, lang) {
    this.tokens = tokens;
    this.lang = lang;
    this.pos = 0;
    this.bytecode = [];
    this.declaredVars = new Set();
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || { type: 'EOF', value: 'EOF', line: 1 };
  }

  consume(expectedValue = null) {
    const tok = this.peek();
    if (expectedValue && tok.value !== expectedValue) {
      throw new CompilerError('Syntax', `Expected '${expectedValue}', got '${tok.value}'`, tok.line);
    }
    this.pos++;
    return tok;
  }

  match(val) {
    if (this.peek().value === val) {
      this.pos++;
      return true;
    }
    return false;
  }

  skipNewlines() {
    while (this.peek().type === 'NEWLINE') this.pos++;
  }

  emit(op, arg = null, line = 1) {
    this.bytecode.push({ op, arg, line });
    return this.bytecode.length - 1;
  }

  compile() {
    this.skipNewlines();

    // Unwrap Java class / C int main() boilerplate if present
    if (this.lang === 'java' && this.peek().value === 'public') {
      while (this.peek().type !== 'EOF' && this.peek().value !== '{') this.pos++;
      this.consume('{'); // class body
      while (this.peek().type !== 'EOF' && this.peek().value !== '{') this.pos++;
      this.consume('{'); // main body
      this.parseBlock('}');
      this.consume('}');
      this.consume('}');
    } else if (this.lang === 'c' && this.peek().value === 'int' && this.peek(1).value === 'main') {
      while (this.peek().type !== 'EOF' && this.peek().value !== '{') this.pos++;
      this.consume('{');
      this.parseBlock('}');
      this.consume('}');
    } else {
      while (this.peek().type !== 'EOF') {
        this.parseStatement();
        this.skipNewlines();
      }
    }

    this.emit('HALT', null, this.peek().line);
    return this.bytecode;
  }

  parseBlock(endToken) {
    this.skipNewlines();
    while (this.peek().type !== 'EOF' && this.peek().value !== endToken && this.peek().type !== 'DEDENT') {
      this.parseStatement();
      this.skipNewlines();
    }
  }

  parseStatement() {
    this.skipNewlines();
    const tok = this.peek();

    // Return statement (ignored in top-level main)
    if (tok.value === 'return') {
      this.consume('return');
      if (this.peek().value !== ';' && this.peek().type !== 'NEWLINE') {
        this.parseExpression();
        this.emit('POP', null, tok.line);
      }
      this.match(';');
      return;
    }

    // Print statement
    // Print statement (Supports single or multiple comma-separated arguments & %d/%f/%s)
    if (['print', 'printf', 'System.out.println', 'System.out.print'].includes(tok.value)) {
      this.consume();
      this.consume('(');

      if (this.peek().type === 'STRING' && this.peek(1).value === ',') {
        const formatStr = this.consume().value;
        const args = [];
        while (this.match(',')) {
          this.parseExpression();
          args.push(true);
        }
        this.consume(')');
        this.match(';');
        this.emit('PUSH_CONST', formatStr, tok.line);
        this.emit('PRINTF', args.length, tok.line);
      } else {
        this.parseExpression();
        while (this.match(',')) {
          this.parseExpression();
          this.emit('PRINT', null, tok.line);
        }
        this.consume(')');
        this.match(';');
        this.emit('PRINT', null, tok.line);
      }
      return;
    }

    // If / Else statement
    if (tok.value === 'if') {
      this.consume('if');
      if (this.lang !== 'python') this.consume('(');
      this.parseExpression();
      if (this.lang !== 'python') this.consume(')');

      const jmpFalseIdx = this.emit('JMP_IF_FALSE', -1, tok.line);
      this.parseSuite();

      if (this.peek().value === 'else') {
        this.consume('else');
        const jmpEndIdx = this.emit('JMP', -1, this.peek().line);
        this.bytecode[jmpFalseIdx].arg = this.bytecode.length;
        this.parseSuite();
        this.bytecode[jmpEndIdx].arg = this.bytecode.length;
      } else {
        this.bytecode[jmpFalseIdx].arg = this.bytecode.length;
      }
      return;
    }

    // While loop
    if (tok.value === 'while') {
      this.consume('while');
      const loopStart = this.bytecode.length;
      if (this.lang !== 'python') this.consume('(');
      this.parseExpression();
      if (this.lang !== 'python') this.consume(')');

      const jmpFalseIdx = this.emit('JMP_IF_FALSE', -1, tok.line);
      this.parseSuite();
      this.emit('JMP', loopStart, tok.line);
      this.bytecode[jmpFalseIdx].arg = this.bytecode.length;
      return;
    }

    // C / Java For loop
    if (tok.value === 'for' && this.lang !== 'python') {
      this.consume('for');
      this.consume('(');
      // Init
      if (this.peek().value !== ';') this.parseAssignmentOrDecl(false);
      this.consume(';');

      const condStart = this.bytecode.length;
      if (this.peek().value !== ';') {
        this.parseExpression();
      } else {
        this.emit('PUSH_CONST', true, tok.line);
      }
      this.consume(';');

      const jmpExit = this.emit('JMP_IF_FALSE', -1, tok.line);
      const jmpBody = this.emit('JMP', -1, tok.line);

      const updateStart = this.bytecode.length;
      if (this.peek().value !== ')') {
        this.parseAssignmentOrDecl(false);
      }
      this.consume(')');
      this.emit('JMP', condStart, tok.line);

      this.bytecode[jmpBody].arg = this.bytecode.length;
      this.parseSuite();
      this.emit('JMP', updateStart, tok.line);
      this.bytecode[jmpExit].arg = this.bytecode.length;
      return;
    }

    // Variable Declaration or Assignment
    this.parseAssignmentOrDecl(true);
  }

  parseSuite() {
    if (this.lang === 'python') {
      this.consume(':');
      this.skipNewlines();
      this.consume('INDENT');
      this.parseBlock('DEDENT');
      this.consume('DEDENT');
    } else {
      this.consume('{');
      this.parseBlock('}');
      this.consume('}');
    }
  }

  parseAssignmentOrDecl(requireSemi) {
    const tok = this.peek();
    const typeKeywords = ['int', 'float', 'double', 'String', 'boolean'];
    let isDecl = false;

    if (this.lang !== 'python' && typeKeywords.includes(tok.value)) {
      this.consume();
      isDecl = true;
    }

    if (this.peek().type !== 'IDENT') {
      throw new CompilerError('Syntax', `Unexpected token '${this.peek().value}'`, this.peek().line);
    }

    const varTok = this.consume();
    if (this.lang !== 'python' && !isDecl && !this.declaredVars.has(varTok.value)) {
      throw new CompilerError('Semantic', `Undeclared variable '${varTok.value}'`, varTok.line);
    }

    this.declaredVars.add(varTok.value);

    if (this.match('=')) {
      this.parseExpression();
      this.emit('STORE_VAR', varTok.value, varTok.line);
    } else if (isDecl) {
      this.emit('PUSH_CONST', 0, varTok.line);
      this.emit('STORE_VAR', varTok.value, varTok.line);
    } else {
      throw new CompilerError('Syntax', `Expected '=' after '${varTok.value}'`, varTok.line);
    }

    if (requireSemi && this.lang !== 'python') {
      this.consume(';');
    }
  }

  // Precedence Climbing Expression Parser
  parseExpression() {
    this.parseComparison();
  }

  parseComparison() {
    this.parseAdditive();
    const cmpMap = {
      '==': 'CMP_EQ',
      '!=': 'CMP_NEQ',
      '<': 'CMP_LT',
      '>': 'CMP_GT',
      '<=': 'CMP_LTE',
      '>=': 'CMP_GTE'
    };
    while (cmpMap[this.peek().value]) {
      const opTok = this.consume();
      this.parseAdditive();
      this.emit(cmpMap[opTok.value], null, opTok.line);
    }
  }

  parseAdditive() {
    this.parseMultiplicative();
    while (['+', '-'].includes(this.peek().value)) {
      const opTok = this.consume();
      this.parseMultiplicative();
      this.emit(opTok.value === '+' ? 'ADD' : 'SUB', null, opTok.line);
    }
  }

  parseMultiplicative() {
    this.parsePrimary();
    while (['*', '/', '%'].includes(this.peek().value)) {
      const opTok = this.consume();
      this.parsePrimary();
      const map = { '*': 'MUL', '/': 'DIV', '%': 'MOD' };
      this.emit(map[opTok.value], null, opTok.line);
    }
  }

  parsePrimary() {
    const tok = this.peek();

    if (tok.type === 'NUMBER' || tok.type === 'STRING' || tok.type === 'BOOL') {
      this.consume();
      this.emit('PUSH_CONST', tok.value, tok.line);
      return;
    }

    if (tok.type === 'IDENT') {
      this.consume();
      this.emit('LOAD_VAR', tok.value, tok.line);
      return;
    }

    if (tok.value === '(') {
      this.consume('(');
      this.parseExpression();
      this.consume(')');
      return;
    }

    throw new CompilerError('Syntax', `Invalid expression token '${tok.value}'`, tok.line);
  }
}

// ==========================================
// 4. STACK-BASED VIRTUAL MACHINE (TinyVM)
// ==========================================
class TinyVM {
  constructor(bytecode) {
    this.bytecode = bytecode;
    this.ip = 0;
    this.stack = [];
    this.memory = {};
    this.cycles = 0;
    this.halted = false;
    this.lastUpdatedVar = null;
  }

  step() {
    if (this.halted || this.ip >= this.bytecode.length) {
      this.halted = true;
      return { done: true };
    }

    const instr = this.bytecode[this.ip];
    this.cycles++;
    this.lastUpdatedVar = null;

    if (this.cycles > 5000) {
      throw new CompilerError('Runtime', 'Infinite loop protection triggered (>5000 cycles)', instr.line);
    }

    let output = null;

    switch (instr.op) {
      case 'PUSH_CONST':
        this.stack.push(instr.arg);
        this.ip++;
        break;

      case 'LOAD_VAR':
        if (!(instr.arg in this.memory)) {
          throw new CompilerError('Runtime', `Undefined variable '${instr.arg}'`, instr.line);
        }
        this.stack.push(this.memory[instr.arg]);
        this.ip++;
        break;

      case 'STORE_VAR': {
        const val = this.pop(instr.line);
        this.memory[instr.arg] = val;
        this.lastUpdatedVar = instr.arg;
        this.ip++;
        break;
      }

      case 'ADD':
      case 'SUB':
      case 'MUL':
      case 'DIV':
      case 'MOD': {
        const b = this.pop(instr.line);
        const a = this.pop(instr.line);
        if ((instr.op === 'DIV' || instr.op === 'MOD') && b === 0) {
          throw new CompilerError('Runtime', 'Division by zero', instr.line);
        }
        const res =
          instr.op === 'ADD' ? a + b :
          instr.op === 'SUB' ? a - b :
          instr.op === 'MUL' ? a * b :
          instr.op === 'DIV' ? (typeof a === 'number' && typeof b === 'number' ? Math.trunc((a / b) * 10000) / 10000 : a / b) :
          a % b;
        this.stack.push(res);
        this.ip++;
        break;
      }

      case 'CMP_EQ':
      case 'CMP_NEQ':
      case 'CMP_LT':
      case 'CMP_GT':
      case 'CMP_LTE':
      case 'CMP_GTE': {
        const b = this.pop(instr.line);
        const a = this.pop(instr.line);
        const res =
          instr.op === 'CMP_EQ' ? a === b :
          instr.op === 'CMP_NEQ' ? a !== b :
          instr.op === 'CMP_LT' ? a < b :
          instr.op === 'CMP_GT' ? a > b :
          instr.op === 'CMP_LTE' ? a <= b :
          a >= b;
        this.stack.push(res);
        this.ip++;
        break;
      }

      case 'JMP':
        this.ip = instr.arg;
        break;

      case 'JMP_IF_FALSE': {
        const cond = this.pop(instr.line);
        if (!cond) {
          this.ip = instr.arg;
        } else {
          this.ip++;
        }
        break;
      }

      case 'PRINT': {
        const val = this.pop(instr.line);
        output = String(val);
        this.ip++;
        break;
      }

      case 'PRINTF': {
        const fmt = this.pop(instr.line);
        const vals = [];
        for (let i = 0; i < instr.arg; i++) {
          vals.unshift(this.pop(instr.line));
        }
        let idx = 0;
        output = String(fmt).replace(/%[dfsc]/g, () => (idx < vals.length ? vals[idx++] : ''));
        this.ip++;
        break;
      }

      case 'POP':
        this.pop(instr.line);
        this.ip++;
        break;

      case 'HALT':
        this.halted = true;
        break;

      default:
        throw new CompilerError('Runtime', `Unknown opcode '${instr.op}'`, instr.line);
    }

    return { done: this.halted, output, line: instr.line };
  }

  pop(line) {
    if (this.stack.length === 0) {
      throw new CompilerError('Runtime', 'Stack underflow', line);
    }
    return this.stack.pop();
  }
}

// ==========================================
// 5. UI CONTROLLER & VISUALIZATION
// ==========================================
const langSelect = document.getElementById('langSelect');
const presetSelect = document.getElementById('presetSelect');
const sourceEditor = document.getElementById('sourceEditor');
const lineNumbers = document.getElementById('lineNumbers');
const bytecodeBody = document.getElementById('bytecodeBody');
const stackContainer = document.getElementById('stackContainer');
const memoryBody = document.getElementById('memoryBody');
const consoleOutput = document.getElementById('consoleOutput');
const statusBadge = document.getElementById('statusBadge');
const ipBadge = document.getElementById('ipBadge');
const cycleBadge = document.getElementById('cycleBadge');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');

let vm = null;
let autoTimer = null;
let activeLine = null;
let errorLine = null;

function updateLineNumbers() {
  const lines = sourceEditor.value.split('\n');
  lineNumbers.innerHTML = lines.map((_, idx) => {
    const ln = idx + 1;
    let cls = '';
    if (ln === errorLine) cls = 'error-line';
    else if (ln === activeLine) cls = 'active-line';
    return `<div class="${cls}">${ln}</div>`;
  }).join('');
}

function logConsole(text, type = 'out') {
  const div = document.createElement('div');
  div.className = `log-${type}`;
  div.textContent = type === 'out' ? `> ${text}` : text;
  consoleOutput.appendChild(div);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function setStatus(label, state) {
  statusBadge.textContent = label;
  statusBadge.className = `badge ${state}`;
}

function renderBytecode() {
  if (!vm || vm.bytecode.length === 0) {
    bytecodeBody.innerHTML = '<tr><td colspan="4" class="empty-msg">No bytecode generated.</td></tr>';
    return;
  }

  bytecodeBody.innerHTML = vm.bytecode.map((ins, idx) => {
    const isCurrent = idx === vm.ip && !vm.halted;
    const argDisplay = ins.arg === null ? '—' : typeof ins.arg === 'string' ? `"${ins.arg}"` : ins.arg;
    return `
      <tr class="${isCurrent ? 'active-ip' : ''}" id="bc-row-${idx}">
        <td>${String(idx).padStart(2, '0')}</td>
        <td class="opcode-tag">${ins.op}</td>
        <td class="operand-tag">${argDisplay}</td>
        <td>L${ins.line}</td>
      </tr>
    `;
  }).join('');

  const activeRow = document.getElementById(`bc-row-${vm.ip}`);
  if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });
}

function renderVMState() {
  if (!vm) return;
  ipBadge.textContent = `IP: ${vm.ip}`;
  cycleBadge.textContent = `Cycles: ${vm.cycles}`;

  // Render Operand Stack
  if (vm.stack.length === 0) {
    stackContainer.innerHTML = '<div class="empty-msg">Stack is empty</div>';
  } else {
    stackContainer.innerHTML = vm.stack.map((val, idx) => {
      const isTop = idx === vm.stack.length - 1;
      const typeName = typeof val;
      return `
        <div class="stack-item ${isTop ? 'top-slot' : ''}">
          <span>[${idx}] ${JSON.stringify(val)}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${isTop ? 'TOP • ' : ''}${typeName}</span>
        </div>
      `;
    }).join('');
  }

  // Render Variables / Memory Frame
  const entries = Object.entries(vm.memory);
  if (entries.length === 0) {
    memoryBody.innerHTML = '<tr><td colspan="3" class="empty-msg">No variables allocated</td></tr>';
  } else {
    memoryBody.innerHTML = entries.map(([k, v]) => {
      const updated = k === vm.lastUpdatedVar ? 'mem-row-updated' : '';
      return `
        <tr class="${updated}">
          <td>${k}</td>
          <td style="color: var(--text-muted);">${typeof v}</td>
          <td style="color: var(--accent-green); font-weight: 600;">${JSON.stringify(v)}</td>
        </tr>
      `;
    }).join('');
  }

  renderBytecode();
  updateLineNumbers();
}

function stopAuto() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    document.getElementById('btnAuto').textContent = '⏩ Auto-Step';
  }
}

function compileSource() {
  stopAuto();
  consoleOutput.innerHTML = '';
  activeLine = null;
  errorLine = null;

  try {
    const tokens = tokenize(sourceEditor.value, langSelect.value);
    const compiler = new Compiler(tokens, langSelect.value);
    const bytecode = compiler.compile();
    vm = new TinyVM(bytecode);
    setStatus('COMPILED', 'running');
    logConsole(`Compiled ${bytecode.length} bytecode instructions successfully.`, 'sys');
    renderVMState();
    return true;
  } catch (err) {
    vm = null;
    errorLine = err.line || null;
    updateLineNumbers();
    setStatus('COMPILE ERROR', 'error');
    logConsole(err.message, 'err');
    return false;
  }
}

function stepVM() {
  if (!vm || vm.halted) {
    if (!compileSource()) return false;
  }

  try {
    const currentInstr = vm.bytecode[vm.ip];
    if (currentInstr) activeLine = currentInstr.line;

    const res = vm.step();
    if (res.output !== null) {
      logConsole(res.output, 'out');
    }

    renderVMState();

    if (res.done) {
      stopAuto();
      activeLine = null;
      updateLineNumbers();
      setStatus('HALTED', 'idle');
      logConsole(`Execution finished in ${vm.cycles} cycles.`, 'sys');
      return false;
    }
    return true;
  } catch (err) {
    stopAuto();
    errorLine = err.line || null;
    updateLineNumbers();
    setStatus('RUNTIME ERROR', 'error');
    logConsole(err.message, 'err');
    return false;
  }
}

function runAll() {
  if (!compileSource()) return;
  while (stepVM()) {}
}

function toggleAuto() {
  if (autoTimer) {
    stopAuto();
    return;
  }
  if (!vm || vm.halted) {
    if (!compileSource()) return;
  }
  document.getElementById('btnAuto').textContent = '⏸ Pause';
  autoTimer = setInterval(() => {
    if (!stepVM()) stopAuto();
  }, Number(speedSlider.value));
}

function loadPreset() {
  stopAuto();
  vm = null;
  activeLine = null;
  errorLine = null;
  sourceEditor.value = PRESETS[langSelect.value][presetSelect.value];
  consoleOutput.innerHTML = '';
  bytecodeBody.innerHTML = '<tr><td colspan="4" class="empty-msg">Click "Compile & Run" or "Step" to generate bytecode.</td></tr>';
  stackContainer.innerHTML = '<div class="empty-msg">Stack is empty</div>';
  memoryBody.innerHTML = '<tr><td colspan="3" class="empty-msg">No variables allocated</td></tr>';
  ipBadge.textContent = 'IP: 0';
  cycleBadge.textContent = 'Cycles: 0';
  setStatus('READY', 'idle');
  updateLineNumbers();
}

// Event Listeners
langSelect.addEventListener('change', loadPreset);
presetSelect.addEventListener('change', loadPreset);
sourceEditor.addEventListener('input', () => {
  errorLine = null;
  updateLineNumbers();
});
sourceEditor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = sourceEditor.scrollTop;
});
sourceEditor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = sourceEditor.selectionStart;
    const end = sourceEditor.selectionEnd;
    sourceEditor.value = sourceEditor.value.substring(0, start) + '    ' + sourceEditor.value.substring(end);
    sourceEditor.selectionStart = sourceEditor.selectionEnd = start + 4;
    updateLineNumbers();
  }
});

document.getElementById('btnRun').addEventListener('click', runAll);
document.getElementById('btnStep').addEventListener('click', stepVM);
document.getElementById('btnAuto').addEventListener('click', toggleAuto);
document.getElementById('btnReset').addEventListener('click', loadPreset);
document.getElementById('btnClearConsole').addEventListener('click', () => {
  consoleOutput.innerHTML = '';
});

speedSlider.addEventListener('input', () => {
  speedLabel.textContent = `${speedSlider.value}ms`;
  if (autoTimer) {
    stopAuto();
    toggleAuto();
  }
});

// ISA Docs Modal
const docsModal = document.getElementById('docsModal');
document.getElementById('btnDocs').addEventListener('click', () => docsModal.classList.remove('hidden'));
document.getElementById('btnCloseDocs').addEventListener('click', () => docsModal.classList.add('hidden'));
docsModal.addEventListener('click', (e) => {
  if (e.target === docsModal) docsModal.classList.add('hidden');
});

// Initialize default view
loadPreset();