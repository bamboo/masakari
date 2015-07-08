#external (describe, it, before-each)

#metaimport '..'

refer (require 'chai') [expect, assert]

var mori = require 'mori'

fun mori-expect(actual, expected) ->
  assert
    mori.equals(actual, expected)
    'expecting `' + expected.to-string() + "' to equal `" + actual.to-string() + "'"


describe
  '::symbol'
  () ->
    it
      'is a string'
      () -> expect(::foo).to.equal 'foo'


describe
  '::{}'
  () ->
    it
      'is a hash-map'
      () ->
        mori-expect
          ::{::foo ::bar}
          mori.hash-map('foo', 'bar')


describe
  '::[]'
  () ->
    it
      'is a vector'
      () ->
        mori-expect
          ::[1, 2, 3]
          mori.vector(1, 2, 3)


describe
  '::()'
  () ->
    it
      'is a list'
      () ->
        mori-expect
          ::()
          mori.list()


describe
  'refer container name'
  () ->
    it
      'var name = container.name'
      () ->
        refer {foo: 'bar'} foo
        expect(foo).to.equal 'bar'


describe
  'case'
  () ->
    it
      'allows single case'
      () ->
        var f = v ->
          case v
            ::foo 42
        expect(f(::foo)).to.equal 42

    it
      'allows multiple cases'
      () ->
        var f = v ->
          case v
            ::foo 42
            ::bar ::baz
        expect(f(::foo)).to.equal 42
        expect(f(::bar)).to.equal ::baz

    it
      'throws Error when no cases match'
      () ->
        var f = () ->
          var v = ::bar
          case v
            ::foo 42
        expect(f).to.throw Error

    it
      'allows else clause'
      () ->
        var f = () ->
          var v = ::bar
          case v
            ::foo 42
            else ()
        expect(f ()).to.equal undefined


describe
  '!!'
  () ->
    it
      'can get from maps'
      () -> expect(::bar).to.equal(::{::foo ::bar} !! ::foo)

    it
      'can get from vectors'
      () -> expect(::bar).to.equal(::[::foo, ::bar] !! 1)

    it
      'can get from nested associations'
      () -> expect(::gazonk).to.equal
        ::{::foo ::{::bar ::[::baz, ::gazonk]}} !! (::foo, ::bar, 1)


describe
  '#let'
  () ->
    it
      'can destructure array'
      () ->
        var v =
          #let [fst, snd] = [1, 2]
            [snd, fst]
        expect(v).to.eql([2, 1])

    it
      'can destructure vector'
      () ->
        var v =
          #let [fst, snd] = ::[1, 2]
            [snd, fst]
        expect(v).to.eql([2, 1])

    it
      'can destructure list'
      () ->
        var v =
          #let [fst, snd] = ::(1, 2)
            [snd, fst]
        expect(v).to.eql([2, 1])

    it
      'can destructure object'
      () ->
        var v =
          #let {x, y} = {x: 1, y: 2}
            [x, y]
        expect(v).to.eql([1, 2])

    [undefined, null].for-each #->
      it
        'can destructure ' + #it + ' as object'
        () ->
          var v =
            #let {x, y} = #it
              [x, y]
          expect(v).to.eql([undefined, undefined])

    it
      'can destructure object into explicitly named variables'
      () ->
        var v =
          #let {value: x, y} = {x: 1, y: 2}
            [value, y]
        expect(v).to.eql([1, 2])

    it
      'evaluates value only once'
      () ->
        var i = 0
        var v =
          #let {x} = {x: (i++)}
            x
        expect(i).to.eql 1
        expect(v).to.eql 1

    it
      'can destructure nested objects'
      ; () ->
      ;   var v =
      ;     #let {{x, y}: center} = {center: {x: 1, y: 2}}
      ;       [x, y]
      ;   expect(v).to.eql([1, 2])

    it
      'can destructure map'
      () ->
        var v =
          #let {x, y} = ::{x: 1, y: 2}
            [x, y]
        expect(v).to.eql([1, 2])

    it
      'can produce tuple'
      () ->
        var (product, sum) =
          #let [a, b] = [1, 2]
            a * b
            a + b
        expect([product, sum]).to.eql([2, 3])


describe
  'fun'
  () ->
    it
      'can define nullary functions'
      () ->
        fun f
          () -> 42
        expect(f()).to.equal 42

    it
      'can define unary functions'
      () ->
        fun f
          a -> a * 2
        expect(f(21)).to.equal 42

    it
      'can define functions with multiple arities'
      () ->
        fun f
          () -> 42
          (a) -> a * 3
        expect(f()).to.equal 42
        expect(f(7)).to.equal 21

    it
      'can define variadic functions'
      () ->
        fun f(&args) -> args
        expect(f()).to.eql([])
        expect(f(42)).to.eql([42])

    it
      'throws when multiple arity fun call has the wrong arity'
      () ->
        fun f
          a -> a
          (a, b) -> a
        expect(f).to.throw Error

    it
      'does NOT throw when single arity fun call has the wrong arity'
      () ->
        fun f a -> a
        expect(f()).to.equal undefined

    it
      'can define functions ending in !'
      () ->
        fun f!() -> 42
        expect(f!()).to.eql 42

    it
      'can redefine vars as simple parameters'
      () ->
        var a = 0
        fun f a ->
          a += a
        expect(a).to.equal 0
        expect(f(21)).to.equal 42
        expect(a).to.equal 0

    it
      'can destructure array argument'
      () ->
        fun f [fst, snd] -> [snd, fst]
        expect(f([1, 2])).to.eql([2, 1])

    it
      'can destructure list argument'
      () ->
        fun f [fst, snd] -> [snd, fst]
        expect(f ::(1, 2)).to.eql([2, 1])

    it
      'can destructure object argument'
      () ->
        fun f {x, y} -> [x, y]
        expect(f {x: 1, y: 2}).to.eql([1, 2])

    [undefined, null].for-each #->
      it
        'can destructure ' + #it + ' argument as object'
        () ->
          fun f {x, y} -> [x, y]
          expect(f #it).eql([undefined, undefined])

    it
      'can destructure map argument'
      () ->
        fun f {x, y} -> [x, y]
        expect(f ::{x: 1, y: 2}).to.eql([1, 2])

    it
      'can destructure on multiple arities'
      () ->
        fun f
          {x} -> [x]
          ({x}, {y}) -> [x, y]
        expect(f {x: 1}).to.eql([1])
        expect(f({x: 1}, {y: 2})).to.eql([1, 2])

    it
      'can destructure variadic function args'
      () ->
        fun f
          (&[fst, snd]) -> if snd [snd] else []
        expect(f()).to.eql([])
        expect(f(0)).to.eql([])
        expect(f(0, 42)).to.eql([42])

    it
      'can be used in argument position'
      () ->
        mori-expect
          mori.map
            fun subtract [fst, snd] -> fst - snd
            [[1, 2], [2, 4]]
          ::(-1, -2)

    it
      'can be used in argument position anonymously'
      () ->
        mori-expect
          [1, 2, 2, 4] |>>
            mori.partition
              2
            mori.map
              fun [x, y] -> x - y
          ::(-1, -2)

describe
  'multimethods (#defmulti, #defmethod)'
  () ->
    it
      'can dispatch on arbitrary expression'
      () ->
        #defmulti mm v -> typeof v
        #defmethod mm ::string v -> "it's '" + v + "'"
        #defmethod mm ::number v -> "a number it is: " + v
        expect(mm '42').to.equal "it's '42'"
        expect(mm 42).to.equal "a number it is: 42"

    it
      'throws when appropriate method cannot be found'
      () ->
        #defmulti mm v -> typeof v
        #defmethod mm ::string v -> "a string"
        expect(() -> mm 42).to.throw Error

    it
      'can dispatch to default when appropriate method cannot be found'
      () ->
        #defmulti mm v -> typeof v
        #defmethod mm ::string v -> "a string"
        #defmethod mm ::default v -> "don't know what to make of " + v
        expect(mm 42).to.equal "don't know what to make of 42"


#defmacro for-all
  unary
  LOW
  expand: args ->
    assert! args.count == 2
    var actual = args.at 0
    var expected = args.at 1
    fun str node -> ast.new-value(node.to-expression-string())
    ` expect(~`str actual).to.equal ~`str expected


describe
  '|>>'
  () ->

    it
      'a |>> b => b(a)'
      () ->
        for-all
          a |>> b
          b(a)

    it
      'a |>> b(x) => b(x, a)'
      () ->
        for-all
          a |>> b x
          b(x, a)

    it
      'a |>> (b, c) => c(b(a))'
      () ->
        for-all
          a |>>
            b
            c
          c(b(a))

    it
      'a |>> (b(x), c(y, z)) => c(y, z, b(x, a))'
      () ->
        for-all
          a |>>
            b x
            c
              y
              z
          c(y, z, b(x, a))

    it
      '|>> (a, b) => b(a)'
      () ->
        for-all
          |>> (a, b)
          b(a)


describe
  '|.>'
  () ->

    it
      'a |.> b => a.b'
      () ->
        for-all
          a |.> b
          a.b

    it
      'a |.> (b, c) => a.b.c'
      () ->
        for-all
          a |.>
            b
            c
          a.b.c

    it
      'a |.> f(x) => a.f(x)'
      () ->
        for-all
          a |.> f x
          a.f(x)

    it
      'a |.> (f(x), g(y, z)) => a.f(x).g(y, z)'
      () ->
        for-all
          a |.>
            f x
            g
              y
              z
          a.f(x).g(y, z)

    it
      '|.> (a, b) => a.b'
      () ->
        for-all
          |.>
            a
            b
          a.b


describe
  '|>'
  () ->

    it
      'a |> .b => a.b'
      () ->
        for-all
          a |>
            .b
          a.b

    it
      'a |> .b() => a.b()'
      () ->
        for-all
          a |>
            .b()
          a.b()

    it
      'a |> .b().c() => a.b().c()'
      () ->
        for-all
          a |>
            .b().c()
          a.b().c()

    it
      'a |> (.b, .c) => a.b.c'
      () ->
        for-all
          a |>
            .b
            .c
          a.b.c

    it
      'a |> f => f(a)'
      () ->
        for-all
          a |> f
          f(a)

    it
      'a |> (f, g) => g(f(a))'
      () ->
        for-all
          a |> (f, g)
          g(f(a))

    it
      'a |> f b => f(b)(a)'
      () ->
        for-all
          a |>
            f b
          f(b)(a)

    it
      'a |> * b => a * b'
      () ->
        for-all
          a |>
            * b
          a * b

    it
      'a |> b / => b / a'
      () ->
        for-all
          a |>
            b /
          b / a

    it
      'a |> b + # + c => b + a + c'
      () ->
        for-all
          a |>
            b + # + c
          b + a + c

    it
      'a |> {p:} => {p: a}'
      () ->
        for-all
          a |>
            {p:}
          {p: a}

    it
      'a |> {p: #} => {p: a}'
      () ->
        for-all
          a |>
            {p: #}
          {p: a}

    it
      'a |> {p: #.b} => {p: a.b}'
      () ->
        for-all
          a |>
            {p: #.b}
          {p: a.b}

    it
      'a |> {p: #.b, q: #.c} => {p: a.b, q: a.c}'
      () ->
        for-all
          a |>
            {p: #.b, q: #.c}
          {p: a.b, q: a.c}

    it
      'evaluates expression only once when there are multiple placeholders'
      () ->
        var i = 0
        fun f a ->
          i += a
        var v = 42 |>
          f
          {p: # - 1, q: # + 1}
        expect(v).to.eql {p: 41, q: 43}
        expect(i).to.eql 42

    it
      '|> (a, b) => b(a)'
      () ->
        for-all
          |>
            a
            b
          b(a)


describe
  'assert!'
  () ->
    it
      'throws when condition is falsey'
      () ->
        [false, null, undefined, 0, ''].map
          v -> expect(() -> assert! v).to.throw Error

    it
      'evaluates to truthy value'
      () ->
        [true, [], {}, 1, 'foo', ::(), ::[], ::{}].map
          v -> expect(assert! v).to.equal v


describe
  '#doto'
  () ->

    fun push! (a, e) -> do!
      a.push e

    it
      'accepts multiple operations and returns original instance'
      () ->
        var v = #doto []
          push! 1
          push! 2
        expect(v).to.eql([1, 2])

    it
      'accepts multiple dot expressions and returns original instance'
      () ->
        var v = #doto []
          .push 1
          .push 2
        expect(v).to.eql([1, 2])

    it
      'accepts mixed operations and returns original instance'
      () ->
        var v = #doto []
          .push 1
          push! 2
        expect(v).to.eql([1, 2])

    it
      'transforms reference into call'
      () ->
        fun shift! a ->
          a.shift ()
        var v = #doto [1, 2]
          shift!
        expect(v).to.eql([2])

    it
      'transforms dot expression into call'
      () ->
        var v = #doto [1, 2]
          .shift
        expect(v).to.eql([2])

    it
      'accepts assignment to dot expression'
      () ->
        var v = #doto {}
          .foo = 'bar'
          .bar = 'baz'
        expect(v).to.eql {foo: 'bar', bar: 'baz'}

    it
      'accepts explicit placeholders'
      () ->
        fun append! (e, a) -> do!
          a.push e
        var v = #doto []
          append! (42, #)
        expect(v).to.eql([42])
