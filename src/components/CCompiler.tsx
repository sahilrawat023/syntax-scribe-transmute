
import React, { useState, useEffect } from "react";
import { Code, Play, RefreshCw, Eye, Cpu, FileText } from "lucide-react";

// Token types for lexical analysis
const TokenType = {
  KEYWORD: "KEYWORD",
  IDENTIFIER: "IDENTIFIER",
  NUMBER: "NUMBER",
  STRING: "STRING",
  OPERATOR: "OPERATOR",
  DELIMITER: "DELIMITER",
  NEWLINE: "NEWLINE",
  EOF: "EOF",
};

// Lexical Analyzer
class LexicalAnalyzer {
  constructor(code) {
    this.code = code;
    this.position = 0;
    this.tokens = [];
    this.keywords = new Set([
      "int",
      "float",
      "double",
      "char",
      "void",
      "if",
      "else",
      "while",
      "for",
      "return",
      "include",
      "main",
      "printf",
      "scanf",
      "bool",
      "long",
      "short",
    ]);
  }

  tokenize() {
    while (this.position < this.code.length) {
      this.skipWhitespace();
      if (this.position >= this.code.length) break;

      const char = this.code[this.position];

      if (this.isLetter(char) || char === "_") {
        this.readIdentifier();
      } else if (this.isDigit(char)) {
        this.readNumber();
      } else if (char === '"') {
        this.readString();
      } else if (this.isOperator(char)) {
        this.readOperator();
      } else if (this.isDelimiter(char)) {
        this.readDelimiter();
      } else if (char === "\n") {
        this.tokens.push({ type: TokenType.NEWLINE, value: "\n" });
        this.position++;
      } else {
        this.position++;
      }
    }
    this.tokens.push({ type: TokenType.EOF, value: null });
    return this.tokens;
  }

  isLetter(char) {
    return /[a-zA-Z]/.test(char);
  }

  isDigit(char) {
    return /[0-9]/.test(char);
  }

  isOperator(char) {
    return "+-*/%=<>!&|".includes(char);
  }

  isDelimiter(char) {
    return "(){}[];,#".includes(char);
  }

  skipWhitespace() {
    while (
      this.position < this.code.length &&
      /\s/.test(this.code[this.position]) &&
      this.code[this.position] !== "\n"
    ) {
      this.position++;
    }
  }

  readIdentifier() {
    let value = "";
    while (
      this.position < this.code.length &&
      (this.isLetter(this.code[this.position]) ||
        this.isDigit(this.code[this.position]) ||
        this.code[this.position] === "_")
    ) {
      value += this.code[this.position];
      this.position++;
    }

    const type = this.keywords.has(value)
      ? TokenType.KEYWORD
      : TokenType.IDENTIFIER;
    this.tokens.push({ type, value });
  }

  readNumber() {
    let value = "";
    let hasDecimal = false;

    while (
      this.position < this.code.length &&
      (this.isDigit(this.code[this.position]) ||
        (this.code[this.position] === "." && !hasDecimal))
    ) {
      if (this.code[this.position] === ".") hasDecimal = true;
      value += this.code[this.position];
      this.position++;
    }

    this.tokens.push({ type: TokenType.NUMBER, value });
  }

  readString() {
    let value = "";
    this.position++; // Skip opening quote

    while (
      this.position < this.code.length &&
      this.code[this.position] !== '"'
    ) {
      value += this.code[this.position];
      this.position++;
    }

    if (this.position < this.code.length) this.position++; // Skip closing quote
    this.tokens.push({ type: TokenType.STRING, value });
  }

  readOperator() {
    let value = this.code[this.position];
    this.position++;

    // Handle multi-character operators
    if (this.position < this.code.length) {
      const next = this.code[this.position];
      if (
        (value === "=" && next === "=") ||
        (value === "!" && next === "=") ||
        (value === "<" && next === "=") ||
        (value === ">" && next === "=") ||
        (value === "+" && next === "+") ||
        (value === "-" && next === "-") ||
        (value === "&" && next === "&") ||
        (value === "|" && next === "|")
      ) {
        value += next;
        this.position++;
      }
    }

    this.tokens.push({ type: TokenType.OPERATOR, value });
  }

  readDelimiter() {
    const value = this.code[this.position];
    this.position++;
    this.tokens.push({ type: TokenType.DELIMITER, value });
  }
}

// Syntax Analyzer (Parser)
class SyntaxAnalyzer {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
    this.ast = { type: "Program", body: [] };
  }

  parse() {
    while (
      this.position < this.tokens.length &&
      this.tokens[this.position].type !== TokenType.EOF
    ) {
      const node = this.parseStatement();
      if (node) this.ast.body.push(node);
    }
    return this.ast;
  }

  parseStatement() {
    const token = this.getCurrentToken();
    if (!token) return null;

    if (token.type === TokenType.DELIMITER && token.value === "#") {
      return this.parseInclude();
    } else if (token.type === TokenType.KEYWORD) {
      if (
        token.value === "int" ||
        token.value === "float" ||
        token.value === "double" ||
        token.value === "char" ||
        token.value === "void"
      ) {
        return this.parseDeclaration();
      }
    } else if (token.type === TokenType.NEWLINE) {
      this.position++;
      return null;
    }

    this.position++;
    return null;
  }

  parseInclude() {
    this.position++; // Skip #
    const includeToken = this.getCurrentToken();
    if (includeToken && includeToken.value === "include") {
      this.position++;
      const delimiter = this.getCurrentToken();
      if (delimiter && delimiter.value === "<") {
        this.position++;
        const library = this.getCurrentToken();
        this.position++; // Skip library name
        this.position++; // Skip >
        return {
          type: "Include",
          library: library ? library.value : "",
        };
      }
    }
    return null;
  }

  parseDeclaration() {
    const typeToken = this.getCurrentToken();
    this.position++;
    const nameToken = this.getCurrentToken();

    if (nameToken && nameToken.type === TokenType.IDENTIFIER) {
      this.position++;
      const nextToken = this.getCurrentToken();

      if (nextToken && nextToken.value === "(") {
        return this.parseFunction(typeToken.value, nameToken.value);
      } else {
        return this.parseVariable(typeToken.value, nameToken.value);
      }
    }
    return null;
  }

  parseFunction(returnType, name) {
    this.position++; // Skip (
    const params = [];

    // Simple parameter parsing
    while (this.position < this.tokens.length) {
      const token = this.getCurrentToken();
      if (token && token.value === ")") {
        this.position++;
        break;
      }
      if (token && token.type === TokenType.KEYWORD) {
        const paramType = token.value;
        this.position++;
        const paramName = this.getCurrentToken();
        if (paramName && paramName.type === TokenType.IDENTIFIER) {
          params.push({ type: paramType, name: paramName.value });
          this.position++;
        }
      }
      if (this.getCurrentToken() && this.getCurrentToken().value === ",") {
        this.position++;
      }
    }

    return {
      type: "Function",
      returnType,
      name,
      parameters: params,
      body: [],
    };
  }

  parseVariable(varType, name) {
    const node = {
      type: "Variable",
      dataType: varType,
      name,
      value: null,
    };

    const nextToken = this.getCurrentToken();
    if (nextToken && nextToken.value === "=") {
      this.position++;
      const valueToken = this.getCurrentToken();
      if (valueToken) {
        node.value = valueToken.value;
        this.position++;
      }
    }

    return node;
  }

  getCurrentToken() {
    return this.position < this.tokens.length
      ? this.tokens[this.position]
      : null;
  }
}

// Code Generator
class CodeGenerator {
  constructor(ast) {
    this.ast = ast;
  }

  generateJava() {
    let javaCode = "";
    let hasMain = false;
    let imports = [];

    for (const node of this.ast.body) {
      if (node.type === "Include") {
        if (node.library === "stdio.h") {
          imports.push("import java.util.Scanner;");
        }
      } else if (node.type === "Function") {
        if (node.name === "main") {
          hasMain = true;
          javaCode += `    public static void main(String[] args) {\n`;
          javaCode += `        Scanner scanner = new Scanner(System.in);\n`;
          javaCode += `        // Function body\n`;
          javaCode += `    }\n\n`;
        } else {
          const returnType = this.mapJavaType(node.returnType);
          const params = node.parameters
            .map((p) => `${this.mapJavaType(p.type)} ${p.name}`)
            .join(", ");
          javaCode += `    public static ${returnType} ${node.name}(${params}) {\n`;
          javaCode += `        // Function implementation\n`;
          javaCode += `    }\n\n`;
        }
      } else if (node.type === "Variable") {
        const javaType = this.mapJavaType(node.dataType);
        const value = node.value || this.getDefaultValue(javaType);
        javaCode += `        ${javaType} ${node.name} = ${value};\n`;
      }
    }

    if (hasMain) {
      let fullCode = imports.join("\n") + (imports.length > 0 ? "\n\n" : "");
      fullCode += `public class Main {\n${javaCode}}`;
      return fullCode;
    }

    return javaCode;
  }

  generatePython() {
    let pythonCode = "";
    let hasMain = false;

    for (const node of this.ast.body) {
      if (node.type === "Include") {
        // Python doesn't need includes for basic I/O
        continue;
      } else if (node.type === "Function") {
        if (node.name === "main") {
          hasMain = true;
          pythonCode += `def main():\n`;
          pythonCode += `    # Function body\n`;
          pythonCode += `    pass\n\n`;
        } else {
          const params = node.parameters.map((p) => p.name).join(", ");
          pythonCode += `def ${node.name}(${params}):\n`;
          pythonCode += `    # Function implementation\n`;
          pythonCode += `    pass\n\n`;
        }
      } else if (node.type === "Variable") {
        const value = node.value || this.getPythonDefaultValue(node.dataType);
        pythonCode += `    ${node.name} = ${value}\n`;
      }
    }

    if (hasMain) {
      pythonCode += `if __name__ == "__main__":\n    main()\n`;
    }

    return pythonCode;
  }

  mapJavaType(cType) {
    const typeMap = {
      int: "int",
      float: "float",
      double: "double",
      char: "char",
      void: "void",
    };
    return typeMap[cType] || "Object";
  }

  getDefaultValue(javaType) {
    const defaults = {
      int: "0",
      float: "0.0f",
      double: "0.0",
      char: "'\\0'",
      boolean: "false",
    };
    return defaults[javaType] || "null";
  }

  getPythonDefaultValue(cType) {
    const defaults = {
      int: "0",
      float: "0.0",
      double: "0.0",
      char: "''",
      void: "None",
    };
    return defaults[cType] || "None";
  }
}

// Main Compiler Component
export default function CCompiler() {
  const [sourceCode, setSourceCode] = useState(`#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    int x = 5;
    int y = 10;
    int result = add(x, y);
    printf("Result: %d\\n", result);
    return 0;
}`);

  const [outputLanguage, setOutputLanguage] = useState("java");
  const [compiledCode, setCompiledCode] = useState("");
  const [tokens, setTokens] = useState([]);
  const [ast, setAST] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [compilerPhase, setCompilerPhase] = useState("source");
  const [isCompiling, setIsCompiling] = useState(false);

  const compileCode = async () => {
    if (isCompiling) return;
    
    setIsCompiling(true);
    try {
      // Phase 1: Lexical Analysis
      setCompilerPhase("lexical");
      const lexer = new LexicalAnalyzer(sourceCode);
      const tokenList = lexer.tokenize();
      setTokens(tokenList);

      await new Promise(resolve => setTimeout(resolve, 800));

      // Phase 2: Syntax Analysis
      setCompilerPhase("syntax");
      const parser = new SyntaxAnalyzer(tokenList);
      const abstractSyntaxTree = parser.parse();
      setAST(abstractSyntaxTree);

      await new Promise(resolve => setTimeout(resolve, 800));

      // Phase 3: Code Generation
      setCompilerPhase("codegen");
      const generator = new CodeGenerator(abstractSyntaxTree);
      const output =
        outputLanguage === "java"
          ? generator.generateJava()
          : generator.generatePython();
      setCompiledCode(output);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setCompilerPhase("complete");
    } catch (error) {
      setCompiledCode(`Compilation Error: ${error.message}`);
      setCompilerPhase("error");
    } finally {
      setIsCompiling(false);
    }
  };

  const clearCode = () => {
    setSourceCode("");
    setCompiledCode("");
    setTokens([]);
    setAST(null);
    setCompilerPhase("source");
  };

  const getPhaseStatus = (phase) => {
    const phases = ["source", "lexical", "syntax", "codegen", "complete"];
    const currentIndex = phases.indexOf(compilerPhase);
    const phaseIndex = phases.indexOf(phase);
    
    if (currentIndex > phaseIndex) return "completed";
    if (currentIndex === phaseIndex) return "active";
    return "pending";
  };

  const PhaseIndicator = ({ phase, label, icon: Icon, isLast }) => {
    const status = getPhaseStatus(phase);
    
    return (
      <div className="flex items-center">
        <div className="flex flex-col items-center">
          <div className={`
            relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 
            ${status === 'completed' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 
              status === 'active' ? 'bg-blue-500 shadow-lg shadow-blue-500/30 animate-pulse' : 
              'bg-gray-600'
            }
          `}>
            <Icon size={20} className="text-white" />
            {status === 'active' && (
              <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-ping"></div>
            )}
          </div>
          <span className={`mt-2 text-xs font-medium transition-colors duration-300 ${
            status === 'completed' ? 'text-emerald-400' :
            status === 'active' ? 'text-blue-400' :
            'text-gray-500'
          }`}>
            {label}
          </span>
        </div>
        {!isLast && (
          <div className={`w-16 h-0.5 mx-4 transition-colors duration-500 ${
            status === 'completed' ? 'bg-emerald-500' : 'bg-gray-600'
          }`}></div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <Cpu className="text-white" size={28} />
                </div>
                C Language Compiler
              </h1>
              <p className="text-gray-600 mt-1 ml-14">
                Modern compiler with lexical analysis, syntax parsing, and code generation
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="java">☕ Java</option>
                <option value="python">🐍 Python</option>
              </select>
              
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  showAnalysis 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Eye size={16} />
                Analysis
              </button>
              
              <button
                onClick={compileCode}
                disabled={isCompiling}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
              >
                <Play size={16} className={isCompiling ? 'animate-spin' : ''} />
                {isCompiling ? 'Compiling...' : 'Compile'}
              </button>
              
              <button
                onClick={clearCode}
                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium transition-all"
              >
                <RefreshCw size={16} />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compilation Process */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Compilation Process</h3>
          <div className="flex items-center justify-center">
            <PhaseIndicator phase="source" label="Source Code" icon={FileText} />
            <PhaseIndicator phase="lexical" label="Lexical Analysis" icon={Eye} />
            <PhaseIndicator phase="syntax" label="Syntax Analysis" icon={Code} />
            <PhaseIndicator phase="codegen" label="Code Generation" icon={Cpu} />
            <PhaseIndicator phase="complete" label="Complete" icon={Play} isLast />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                <Code size={20} />
                C Source Code
              </h3>
            </div>
            <div className="p-6">
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full h-96 bg-gray-900 text-green-400 font-mono text-sm p-6 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                placeholder="Enter your C code here..."
                style={{ lineHeight: '1.6' }}
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className={`px-6 py-4 ${
              outputLanguage === 'java' 
                ? 'bg-gradient-to-r from-orange-600 to-red-600' 
                : 'bg-gradient-to-r from-blue-600 to-green-600'
            }`}>
              <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                <span className="text-xl">
                  {outputLanguage === "java" ? "☕" : "🐍"}
                </span>
                {outputLanguage === "java" ? "Java" : "Python"} Output
              </h3>
            </div>
            <div className="p-6">
              <pre className="w-full h-96 bg-gray-900 text-yellow-400 font-mono text-sm p-6 rounded-xl overflow-auto">
                {compiledCode || 
                  `// ${outputLanguage === "java" ? "Java" : "Python"} code will appear here after compilation...`
                }
              </pre>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        {showAnalysis && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Compiler Analysis</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tokens */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Lexical Tokens
                  </h4>
                  <div className="bg-gray-900 p-4 rounded-xl h-64 overflow-auto">
                    {tokens.map((token, index) => (
                      <div key={index} className="text-sm mb-2 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                        <span className="text-blue-400 font-medium min-w-20">{token.type}</span>
                        <span className="text-gray-400">:</span>
                        <span className="text-green-400">
                          {token.value || "EOF"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AST */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    Abstract Syntax Tree
                  </h4>
                  <div className="bg-gray-900 p-4 rounded-xl h-64 overflow-auto">
                    <pre className="text-sm text-purple-400 leading-relaxed">
                      {ast
                        ? JSON.stringify(ast, null, 2)
                        : "AST will appear after parsing..."}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            Compiler Design Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Lexical Analysis",
                icon: Eye,
                features: ["Token Recognition", "Keyword Identification", "Symbol Table Management"],
                color: "blue"
              },
              {
                title: "Syntax Analysis", 
                icon: Code,
                features: ["Grammar Parsing", "AST Generation", "Error Detection"],
                color: "green"
              },
              {
                title: "Code Generation",
                icon: Cpu,
                features: ["Target Code Generation", "Type Mapping", "Optimization"],
                color: "purple"
              }
            ].map((feature, index) => (
              <div key={index} className={`p-6 rounded-xl border-2 border-${feature.color}-100 bg-${feature.color}-50/50`}>
                <div className={`w-12 h-12 bg-${feature.color}-500 rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-3">{feature.title}</h4>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="text-gray-600 text-sm flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 bg-${feature.color}-500 rounded-full`}></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
