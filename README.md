## elysp
This is my toy lisp, written in TypeScript to run on [Deno](https://deno.land). It was based on a translation of minilisp, but has since gained more features.

Current features:

- define
- functions (fn and defn)
- closures
- quote and unquote
- macros
- syntactic comments (see below)

## syntactic comments
Syntactic comments remove the next syntactic element. This is best explained with examples.

When placed in front of a list, this will comment out the entire list. Here the whole `print-both` function definition is removed:
```lisp
#- (defn print-both (a b)
  (print a)
  (print b))
```

When placed in front of a value, that value is commented out. Here just `2` will be commented out in the function call:
```lisp
(+ 1 #- 2 3)
```

The implementation of these is straightforward, when "#-" is read, the reader reads the next value and throws it away.