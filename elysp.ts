import { puts, readLine } from './utils.ts';

enum ObjType {
  Pair = 'pair',
  Symbol = 'symbol',
  Nil = 'nil',
  Env = 'env',
  Num = 'num',
  NativeFn = 'nativefn',
  Fn = 'fn',
  String = 'string',
  Macro = 'macro',
}

type ObjPair = {
  type: ObjType.Pair;
  car: Obj;
  cdr: Obj;
}

type ObjSymbol = {
  type: ObjType.Symbol;
  name: string;
}

type ObjString = {
  type: ObjType.String;
  value: string;
}

type ObjEnv = {
  type: ObjType.Env;
  vars: Obj;
  up: Obj;
}

type ObjNum = {
  type: ObjType.Num;
  value: number;
}

type ElyspFn = (env: ObjEnv, args: Obj) => Obj;
type ObjNativeFn = {
  type: ObjType.NativeFn;
  fn: ElyspFn;
}

type ObjFn = {
  type: ObjType.Fn | ObjType.Macro;
  params: Obj;
  body: Obj;
  env: ObjEnv;
}

type ObjNil = { type: ObjType.Nil };

type Obj = ObjPair | ObjSymbol | ObjNil | ObjEnv | ObjNum | ObjNativeFn | ObjFn | ObjString;

const makeNil = (): ObjNil => ({ type: ObjType.Nil });
const makeSymbol = (name: string): ObjSymbol => ({ type: ObjType.Symbol, name });
const makePair = (car: Obj, cdr: Obj): ObjPair => ({ type: ObjType.Pair, car, cdr });
const makeEnv = (vars: Obj, up: Obj): ObjEnv => ({ type: ObjType.Env, vars, up });
const makeNum = (value: number): ObjNum => ({ type: ObjType.Num, value });
const makeNativeFn = (fn: ElyspFn): ObjNativeFn => ({ type: ObjType.NativeFn, fn });
const makeFn = (env: ObjEnv, params: Obj, body: Obj, type: ObjType.Fn | ObjType.Macro): ObjFn => ({ type, env, params, body });
const makeString = (value: string): ObjString => ({ type: ObjType.String, value });

const unreachable = (_: never): never => { throw new Error(); }

const nil = makeNil();
const trueSym = makeSymbol('t');
let symbols: Obj = makeNil();

const cons = makePair;
function acons(x: Obj, y: Obj, a: Obj): Obj {
  return cons(cons(x, y), a);
}

function intern(name: string): ObjSymbol {
  let obj = symbols;
  while (obj.type === ObjType.Pair) {
    if (obj.car.type === ObjType.Symbol && obj.car.name === name) {
      return obj.car;
    }
    obj = obj.cdr;
  }

  const sym = makeSymbol(name);
  symbols = cons(sym, symbols);
  return sym;
}

function addVariable(env: ObjEnv, sym: ObjSymbol, val: Obj) {
  env.vars = acons(sym, val, env.vars);
}

function setVariable(env: ObjEnv, sym: ObjSymbol, val: Obj) {
  let cenv: Obj = env;
  while (cenv.type === ObjType.Env) {
    let obj = cenv.vars;
    while (obj.type === ObjType.Pair) {
      const bind = obj.car;
      if (bind.type === ObjType.Pair && bind.car === sym) {
        bind.cdr = val;
        return;
      }
      obj = obj.cdr;
    }
    cenv = cenv.up;
  }
  // not found, add it
  addVariable(env, sym, val);
}

function pushEnv(env: ObjEnv, vars: Obj, values: Obj): ObjEnv {
  if (listLen(vars) !== listLen(values)) {
    puts('vars: ');
    reprln(vars);
    puts('values: ');
    reprln(values);
    throw new Error('env: mismatched number of vars and values');
  }
  let varObj = vars;
  let valueObj = values;
  let newVars: Obj = nil;
  while (varObj.type === ObjType.Pair && valueObj.type === ObjType.Pair) {
    newVars = acons(varObj.car, valueObj.car, newVars);
    varObj = varObj.cdr;
    valueObj = valueObj.cdr;
  }

  return makeEnv(newVars, env);
}

const cyan = (txt: string) => `\x1b[96m${txt}\x1b[0m`;
const yellow = (txt: string) => `\x1b[93m${txt}\x1b[0m`;

// repr pretty prints the value (with colours etc)
function repr(inputObj: Obj) {
  let obj = inputObj;
  switch (obj.type) {
    // treat an env like a pair, ignore the up ptr
    case ObjType.Env:
      obj = obj.vars;
      // intentional fallthrough
    case ObjType.Pair: {
      puts('(');
      let left = 6; // show 6 max
      while (obj.type === ObjType.Pair) {
        if (left === 0) {
          puts('...');
          break;
        }

        repr(obj.car);
        if (obj.cdr.type === ObjType.Nil) {
          break;
        } else if (obj.cdr.type !== ObjType.Pair) {
          puts(' . ');
          repr(obj.cdr);
          break;
        }
        puts(' ');
        obj = obj.cdr;
        left--;
      }
      puts(')');
      return;
    }
    case ObjType.Symbol: {
      puts(cyan(obj.name));
      return;
    }
    case ObjType.Nil: {
      puts('nil');
      return;
    }
    case ObjType.Num: {
      puts(yellow(obj.value.toString()));
      return;
    }
    case ObjType.NativeFn: {
      puts(`<native function ${obj.fn.name}>`);
      return;
    }
    case ObjType.Fn: {
      puts(`<function>`);
      return;
    }
    case ObjType.Macro: {
      puts(`<macro>`);
      return;
    }
    case ObjType.String: {
      puts(cyan(`"${obj.value}"`));
      return;
    }
    default: {
      unreachable(obj);
    }
  }
}

function reprln(inputObj: Obj) {
  repr(inputObj);
  puts('\n');
}

// print prints a value like the primitive print function will
// no colours, formatting etc
function print(inputObj: Obj) {
  let obj = inputObj;
  switch (obj.type) {
    // treat an env like a pair, ignore the up ptr
    case ObjType.Env:
      obj = obj.vars;
      // intentional fallthrough
    case ObjType.Pair: {
      puts('(');
      let left = 6; // show 6 max
      while (obj.type === ObjType.Pair) {
        if (left === 0) {
          puts('...');
          break;
        }

        print(obj.car);
        if (obj.cdr.type === ObjType.Nil) {
          break;
        } else if (obj.cdr.type !== ObjType.Pair) {
          puts(' . ');
          print(obj.cdr);
          break;
        }
        puts(' ');
        obj = obj.cdr;
        left--;
      }
      puts(')');
      return;
    }
    case ObjType.Symbol: {
      puts(obj.name);
      return;
    }
    case ObjType.Nil: {
      puts('nil');
      return;
    }
    case ObjType.Num: {
      puts(obj.value.toString());
      return;
    }
    case ObjType.NativeFn: {
      puts(`<native function ${obj.fn.name}>`);
      return;
    }
    case ObjType.Fn: {
      puts(`<function>`);
      return;
    }
    case ObjType.Macro: {
      puts(`<macro>`);
      return;
    }
    case ObjType.String: {
      puts(obj.value);
      return;
    }
    default: {
      unreachable(obj);
    }
  }
}

function find(env: ObjEnv, sym: ObjSymbol): Obj | null {
  let cenv: Obj = env;
  while (cenv.type === ObjType.Env) {
    let obj = cenv.vars;
    while (obj.type === ObjType.Pair) {
      const bind = obj.car;
      if (bind.type === ObjType.Pair && bind.car === sym) {
        return bind.cdr;
      }
      obj = obj.cdr;
    }
    cenv = cenv.up;
  }
  return null;
}

function macroExpand(env: ObjEnv, obj: Obj): Obj {
  if (obj.type !== ObjType.Pair) {
    return obj;
  }
  if (obj.car.type !== ObjType.Symbol) {
    return obj;
  }

  const bind = find(env, obj.car);
  if (bind === null || bind.type !== ObjType.Macro) {
    return obj;
  }

  const args = obj.cdr;
  const newEnv = pushEnv(env, bind.params, args);
  let result: Obj = nil;
  forEach(bind.body, (obj: Obj) => {
    result = evaluate(newEnv, obj);
  });
  return result;
}

function evaluate(env: ObjEnv, val: Obj): Obj {
  switch (val.type) {
    case ObjType.String:
    case ObjType.Fn:
    case ObjType.Num: {
      return val;
    }
    case ObjType.Symbol: {
      const result = find(env, val);
      if (result === null) {
        throw new Error(`unknown symbol: ${val.name}`);
      }
      return result;
    }
    case ObjType.Pair: {
      const expanded = macroExpand(env, val);
      if (expanded !== val) {
        return evaluate(env, expanded);
      }
      const fn = evaluate(env, val.car);
      const args = val.cdr;
      return apply(env, fn, args);
    }
    default:
      throw new Error('eval: idk');
  }
}

function evaluateList(env: ObjEnv, list: Obj): Obj {
  let head: ObjPair | null = null;
  let tail: ObjPair | null = null;
  let obj: Obj = list;

  while (obj.type === ObjType.Pair) {
    const result = evaluate(env, obj.car);
    if (head === null) {
      head = tail = cons(result, nil);
    } else if (tail !== null) {
      tail.cdr = cons(result, nil);
      tail = tail.cdr;
    }
    obj = obj.cdr;
  }

  if (head === null) {
    return nil;
  }

  return head;
}

function apply(env: ObjEnv, fn: Obj, args: Obj): Obj {
  switch (fn.type) {
    case ObjType.NativeFn: {
      return fn.fn(env, args);
    }
    case ObjType.Fn: {
      const eargs = evaluateList(env, args);
      const newEnv = pushEnv(fn.env, fn.params, eargs);
      let result: Obj = nil;
      forEach(fn.body, (obj: Obj) => {
        result = evaluate(newEnv, obj);
      });
      return result;
    }
    case ObjType.Pair: {
      checkArity(args, 1);
      const index = getArg(env, args, ObjType.Num, 0) as ObjNum;
      let currentIndex = 0;
      let obj: Obj = fn;
      while (obj.type === ObjType.Pair) {
        if (currentIndex === index.value) {
          return obj.car;
        }
        currentIndex++;
        obj = obj.cdr;
      }
      return nil;
    }
  }
  throw new Error(`cannot apply ${repr(fn)}`);
}

function forEach(list: Obj, callback: (obj: Obj) => void) {
  let obj: Obj = list;
  while (obj.type === ObjType.Pair) {
    callback(obj.car);
    obj = obj.cdr;
  }
}

class Reader {
  source = '';
  pos = 0;

  constructor(source: string) {
    this.source = source;
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.source[this.pos + offset];
  }
  atEof() {
    return this.pos >= this.source.length;
  }
  advance(): string {
    if (this.pos < this.source.length) {
      return this.source[this.pos++];
    }
    return this.source[this.pos];
  }
  consume(c: string): string {
    if (this.peek() === c) {
      return this.advance();
    }
    throw new Error(`syntax error: expected ${c} but not ${this.peek()}`);
  }

  read(): Obj | null {
    try {
      return this.readNext();
    } catch (e) {
      puts(`error at '${this.source.substring(this.pos, this.pos + 10)}...'\n`);
      throw e;
    }
  }

  readNext(): Obj | null {
    this.skipWhitespace();
    this.skipComments();

    if (this.atEof()) {
      return null;
    }

    if (/[0-9]/.test(this.peek())) {
      return this.readNumber();
    }

    switch (this.peek()) {
      case '(': {
        this.advance();
        const list = this.readList();
        this.consume(')');
        return list;
      }
      case '[': {
        this.advance();
        const list = this.readList(']');
        const result = cons(intern('quote'), cons(list, nil));
        this.consume(']');
        return result;
      }
      case "'": {
        this.advance();
        return this.readQuote();
      }
      case ",": {
        this.advance();
        return this.readUnquote();
      }
      case '"': {
        this.advance();
        return this.readString();
      }
      case '#': {
        // must be block comment, normal comments have already been skipped)
        this.consume('#');
        this.consume('-');
        this.readNext(); // intentionally thrown away
        return this.readNext();
      }
      default: {
        // assume symbol
        return this.readSymbol();
      }
    }
  }

  readNumber(): ObjNum {
    const start = this.pos;
    while (!this.atEof() && /[0-9]/.test(this.peek())) {
      this.advance();
    }
    return makeNum(parseInt(this.source.slice(start, this.pos), 10));
  }

  readSymbol(): ObjSymbol {
    const start = this.pos;
    while (!this.atEof() && /[a-z-+=/*!?]/.test(this.peek())) {
      this.advance();
    }
    if (start === this.pos) {
      throw new Error('could not read symbol');
    }
    return intern(this.source.substring(start, this.pos));
  }

  readString(): ObjString {
    const start = this.pos;
    while (!this.atEof() && this.peek() !== '"') {
      this.advance();
    }
    this.consume('"');

    // TO DO interning
    return makeString(this.source.substring(start, this.pos - 1));
  }
  
  // 'obj => (quote obj)
  readQuote(): ObjPair {
    const obj = this.readNext();
    if (obj === null) {
      throw new Error('expected stuff after quote');
    }
    return cons(intern('quote'), cons(obj, nil));
  }

  // ,obj => (unquote obj)
  readUnquote(): ObjPair {
    const obj = this.readNext();
    if (obj === null) {
      throw new Error('expected stuff after unquote');
    }
    return cons(intern('unquote'), cons(obj, nil));
  }

  readList(delim = ')'): ObjPair | ObjNil {
    if (this.peek() === delim) {
      return nil;
    }

    const obj = this.readNext();
    if (obj === null) {
      throw new Error('unexpected end of list');
    }

    const head = cons(obj, nil);
    let tail = head;

    while (true) {
      this.skipWhitespace();
      if (this.peek() === delim) {
        return head;
      }

      let dotted = false;
      if (this.peek() === '.') {
        this.consume('.');
        this.skipWhitespace();
        dotted = true;
      }

      const item = this.readNext();
      if (item === null) {
        throw new Error('unexpected end of list');
      }

      if (dotted) {
        tail.cdr = item;
        return head;
      }
      tail.cdr = cons(item, nil);
      tail = tail.cdr;
    }
  }

  skipWhitespace() {
    while(this.peek() === ' ' || this.peek() === '\n' || this.peek() === '\t') {
      this.advance();
    }
  }

  skipComments() {
    while (this.peek() === '#' && this.peek(1) !== '-') {
      while(this.peek() !== '\n') {
        this.advance();
      }
      this.skipWhitespace();
    }
  }
}

function listLen(list: Obj): number {
  if (list.type !== ObjType.Pair) {
    return 0;
  }

  let obj: Obj = list;
  let len = 0;
  while (obj.type === ObjType.Pair) {
    len++;
    obj = obj.cdr;
  }

  if (obj !== nil) {
    // dotted pair
    len++;
  }
  return len;
}

function isList(list: Obj): boolean {
  return list === nil || list.type === ObjType.Pair;
}

function checkArity(args: Obj, min: number, max: number = min) {
  const len = listLen(args);
  if (len < min || len > max) {
    throw new Error('arity mismatch');
  }
}

function getArg(env: ObjEnv, args: Obj, type: ObjType, index: number): Obj {
  if (args === nil) {
    return nil;
  }
  if (args.type !== ObjType.Pair) {
    throw new Error('expected list as arguments');
  }

  let obj: Obj = args;
  let arg = obj.car;

  for (let i = 0; i < index; i++) {
    if (obj.type === ObjType.Pair) {
      arg = obj.car;
      obj = obj.cdr;
    } else {
      throw new Error('arity mismatch');
    }
  }

  const earg = evaluate(env, arg);

  if (earg.type !== type) {
    throw new Error(`expected type ${type} but got ${arg.type}`);
  }
  return earg;
}

// PRIMITIVES
function primPrintln(env: ObjEnv, args: Obj): Obj {
  if (args.type === ObjType.Pair) {
    const evaledArgs = evaluateList(env, args);
    if (evaledArgs.type === ObjType.Pair) {
      forEach(evaledArgs, (arg: Obj) => {
        print(arg);
        puts(' ');
      });
    }
  } else {
    print(evaluate(env, args));
  }
  puts('\n');
  return nil;
}

function primPlus(env: ObjEnv, args: Obj): Obj {
  if (args.type === ObjType.Pair) {
    const evaledArgs = evaluateList(env, args);
    if (evaledArgs.type === ObjType.Pair) {
      let sum = 0;
      forEach(evaledArgs, (arg: Obj) => {
        if (arg.type !== ObjType.Num) {
          throw new Error('+ expected a number');
        }
        sum += arg.value;
      });
      return makeNum(sum);
    }
  }
  return nil;
}

function evaluateUnquotes(env: ObjEnv, args: Obj): Obj {
  if (args.type === ObjType.Pair && args.car === intern('unquote')) {
    return evaluate(env, args);
  }

  if (args.type !== ObjType.Pair) {
    return args;
  }

  let head: ObjPair | null = null;
  let tail: ObjPair | null = null;
  let obj: Obj = args;

  while (obj.type === ObjType.Pair) {
    const result = evaluateUnquotes(env, obj.car);
    if (head === null) {
      head = tail = cons(result, nil);
    } else if (tail !== null) {
      tail.cdr = cons(result, nil);
      tail = tail.cdr;
    }
    obj = obj.cdr;
  }

  if (head === null) {
    return args;
  }

  return head;
}

function primQuote(env: ObjEnv, args: Obj): Obj {
  if (args.type !== ObjType.Pair) {
    throw new Error('malformed quote');
  }

  return evaluateUnquotes(env, args.car);
}

function primUnquote(env: ObjEnv, args: Obj): Obj {
  checkArity(args, 1);
  return evaluate(env, (args as ObjPair).car);
}

function primDefine(env: ObjEnv, args: Obj): Obj {
  checkArity(args, 2);
  if (!(args.type === ObjType.Pair && args.car.type === ObjType.Symbol)) {
    throw new Error('malformed define');
  }
  if (args.cdr.type !== ObjType.Pair) {
    throw new Error('malformed define');
  }

  const sym = args.car;
  const val = evaluate(env, args.cdr.car);
  addVariable(env, sym, val);
  return val;
}

function primDefn(env: ObjEnv, args: Obj): Obj {
  if (!(args.type === ObjType.Pair && args.car.type === ObjType.Symbol && args.cdr.type === ObjType.Pair)) {
    throw new Error('malformed defn');
  }
  const sym = args.car;
  const rest = args.cdr;
  const fn = primFn(env, rest);
  addVariable(env, sym, fn);
  return fn;
}

function primFn(env: ObjEnv, args: Obj): Obj {
  if (args.type !== ObjType.Pair || !isList(args) || args.cdr.type !== ObjType.Pair) {
    throw new Error('malformed lambda');
  }

  forEach(args.car, (arg: Obj) => {
    if (arg.type !== ObjType.Symbol) {
      throw new Error('parameter must be a symbol');
    }
  });

  return makeFn(env, args.car, args.cdr, ObjType.Fn);
}

function primEqual(env: ObjEnv, args: Obj): Obj {
  let prev: Obj | null = null;
  let eq = true;
  forEach(args, (obj) => {
    if (prev === null) {
      prev = obj;
      return;
    }

    if (!eq) {
      return;
    }

    // reference eq
    eq = obj === prev;
  });

  return eq ? trueSym : nil;
}

function primSlurp(env: ObjEnv, args: Obj): Obj {
  checkArity(args, 1);
  const sym = getArg(env, args, ObjType.String, 0) as ObjString;
  return makeString(Deno.readTextFileSync(sym.value));
}

function primCons(env: ObjEnv, args: Obj): Obj {
  checkArity(args, 2);
  const list = evaluateList(env, args);
  if (list.type !== ObjType.Pair) {
    return nil;
  }
  list.cdr = (list.cdr as ObjPair).car;
  return list;
}

function primReaderDebug(env: ObjEnv): Obj {
  const sym = intern('reader-debug');
  const debug = find(env, sym);
  if (debug === trueSym) {
    puts('reader debugging OFF\n');
    setVariable(env, sym, nil);
  } else {
    puts('reader debugging ON\n');
    setVariable(env, sym, trueSym);
  }
  return nil;
}

function primDefmacro(env: ObjEnv, args: Obj): Obj {
  if (!(args.type === ObjType.Pair && args.car.type === ObjType.Symbol && args.cdr.type === ObjType.Pair)) {
    throw new Error('malformed defmacro');
  }
  const sym = args.car;
  const rest = args.cdr;

  forEach(rest.car, (arg: Obj) => {
    if (arg.type !== ObjType.Symbol) {
      throw new Error('parameter must be a symbol');
    }
  });

  const macro = makeFn(env, rest.car, rest.cdr, ObjType.Macro);
  addVariable(env, sym, macro);
  return macro;
}

function primMacex(env: ObjEnv, args: Obj): Obj {
  checkArity(args, 1);
  return macroExpand(env, (args as ObjPair).car);
}

const env = makeEnv(nil, nil);
addVariable(env, intern('nil'), nil);

const primitives: Record<string, ElyspFn> = {
  'fn': primFn,
  'define': primDefine,
  'defn': primDefn,
  'defmacro': primDefmacro,
  'quote': primQuote,
  'unquote': primUnquote,
  'cons': primCons,
  'print': primPrintln,
  '+': primPlus,
  'env': (env) => env,
  '=': primEqual,
  'slurp': primSlurp,
  'reader/debug': primReaderDebug,
  'macex': primMacex,
};

Object.entries(primitives).map(([name, value]) => {
  addVariable(env, intern(name), makeNativeFn(value));
});

function readerDebugEnabled(env: ObjEnv): boolean {
  return find(env, intern('reader-debug')) === trueSym;
}

if (Deno.args.length) {
  // file
  const src = await Deno.readTextFile(Deno.args[0]);
  const reader = new Reader(src);
  try {
    while (!reader.atEof()) {
      const next = reader.read();
      if (next === null) {
        break;
      }
      if (readerDebugEnabled(env)) {
        puts('reader: ')
        reprln(next);
      }
      evaluate(env, next);
    }
  } catch (e) {
    console.log(e.stack);
  }
} else {
  // REPL
  while (true) {
    const line = await readLine('ely> ');
    try {
      const reader = new Reader(line);
      const next = reader.read();
      if (next === null) {
        break;
      }
      if (readerDebugEnabled(env)) {
        puts('reader: ')
        reprln(next);
      }
      repr(evaluate(env, next));
      puts('\n');
    } catch (e) {
      console.log(e.stack);
    }
  }
}